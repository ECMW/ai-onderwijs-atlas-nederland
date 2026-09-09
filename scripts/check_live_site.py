#!/usr/bin/env python3
"""Read-only live Atlas check. Exit 0: healthy, 1: confirmed fault, 2: unknown.

All downloaded files live in an automatically removed temporary directory.
The checker never changes repository files and never repairs or publishes.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, parse_qsl, unquote, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from uuid import uuid4

DEFAULT_URL = "https://ecmw.github.io/ai-onderwijs-atlas-nederland/"
ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 8 * 1024 * 1024
# Statistics are not required for the catalogue to remain available. Build-time
# validation still checks the original script and its content hash strictly.
OPTIONAL_SCRIPTS = frozenset({"analytics.js"})
OPTIONAL_PLACEHOLDER = "// Optional statistics omitted from the availability smoke test.\n"


class CheckFailure(Exception):
    def __init__(self, code, resource, detail, *, unknown=False):
        self.issue = {"code": code, "resource": resource, "detail": detail}
        self.unknown = unknown
        super().__init__(detail)


def fetch_bytes(url, timeout):
    parsed = urlsplit(url)
    query = [(key, value) for key, value in parse_qsl(parsed.query, keep_blank_values=True) if key != "_atlas_probe"]
    query.append(("_atlas_probe", uuid4().hex))
    request = Request(urlunsplit(parsed._replace(query=urlencode(query))), headers={
        "User-Agent": "Atlas-Live-Check/1.0",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    })
    with urlopen(request, timeout=timeout) as response:
        content = response.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise CheckFailure("response_too_large", url, "Response exceeds 8 MiB", unknown=True)
    return content


class PageAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.inline = []
        self.script = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "script":
            kind = (attrs.get("type") or "").lower()
            if kind not in {"", "text/javascript", "application/javascript"}:
                if kind == "module":
                    raise CheckFailure("unsupported_module", "index.html", "Module scripts need a browser check", unknown=True)
                return
            if attrs.get("src"):
                self.assets.append((attrs["src"], True))
            else:
                self.script = []
        elif tag == "link" and "stylesheet" in (attrs.get("rel") or "").split() and attrs.get("href"):
            self.assets.append((attrs["href"], False))

    def handle_data(self, data):
        if self.script is not None:
            self.script.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.script is not None:
            self.inline.append("".join(self.script))
            self.script = None


def asset_location(site_url, reference):
    base = urljoin(site_url, ".")
    url = urljoin(base, reference)
    parsed, base_parts = urlsplit(url), urlsplit(base)
    base_path = unquote(base_parts.path)
    path = unquote(parsed.path)
    if (parsed.scheme, parsed.netloc) != (base_parts.scheme, base_parts.netloc) or not path.startswith(base_path):
        raise CheckFailure("external_asset", reference, "Asset is outside the monitored site", unknown=True)
    relative = PurePosixPath(path[len(base_path):])
    if not relative.parts or relative.is_absolute() or ".." in relative.parts or "\\" in str(relative):
        raise CheckFailure("invalid_asset_path", reference, "Asset path is not a local public file", unknown=True)
    return url, relative.as_posix()


def public_record(record):
    return (
        isinstance(record, dict)
        and "publicationExclusion" not in record
        and isinstance(record.get("id"), str) and bool(record["id"].strip())
        and isinstance(record.get("title"), str) and bool(record["title"].strip())
        and record.get("recordType") not in ("identified_need", "white_spot")
        and record.get("legacyType") not in ("Behoefte", "Witte vlek")
        and record.get("verificationStatus") in ("verified", "recently_checked")
        and isinstance(record.get("sourceUrls"), list)
        and any(isinstance(source, dict) and source.get("sourceType") == "official"
                and isinstance(source.get("url"), str) and source["url"].startswith(("https://", "http://"))
                for source in record["sourceUrls"])
    )


def validate_data(raw):
    match = re.fullmatch(r"\s*window\.ATLAS_RECORDS\s*=\s*(.*?)\s*;?\s*", raw, re.DOTALL)
    try:
        data = json.loads(match[1]) if match else None
    except json.JSONDecodeError as error:
        raise CheckFailure("invalid_public_json", "data/data-v2.js", str(error)) from error
    if not isinstance(data, dict) or not isinstance(data.get("records"), list):
        raise CheckFailure("invalid_public_data", "data/data-v2.js", "ATLAS_RECORDS has no records array")
    records = data["records"]
    if not records:
        raise CheckFailure("empty_catalogue", "data/data-v2.js", "The public catalogue contains zero records")
    metadata = data.get("metadata")
    count = metadata.get("recordCount") if isinstance(metadata, dict) else None
    if type(count) is not int or count != len(records):
        raise CheckFailure("record_count_mismatch", "data/data-v2.js", "Metadata count does not match the public records")
    if not all(public_record(record) for record in records):
        raise CheckFailure("ineligible_public_record", "data/data-v2.js", "A public record lacks required identity, status or official source")
    if len({record["id"] for record in records}) != count:
        raise CheckFailure("duplicate_public_ids", "data/data-v2.js", "Public records contain duplicate IDs")
    return count


def check_javascript(site, scripts, inline):
    node = shutil.which("node")
    if not node:
        raise CheckFailure("node_unavailable", "local checker", "Node.js is required to verify JavaScript", unknown=True)
    paths = list(scripts)
    warnings = []
    for index, code in enumerate(inline):
        relative = f".atlas-check-inline-{index}.js"
        (site / relative).write_text(code, encoding="utf-8")
        paths.append(relative)
    for relative in paths:
        result = subprocess.run([node, "--check", str(site / relative)], capture_output=True,
                                text=True, encoding="utf-8", timeout=10)
        if result.returncode:
            # Temporary paths vary between attempts and are not useful evidence.
            detail = result.stderr.replace(str(site), "<snapshot>")[-1200:]
            if relative in OPTIONAL_SCRIPTS:
                warnings.append({"code": "javascript_syntax", "resource": relative, "detail": detail})
            else:
                raise CheckFailure("javascript_syntax", relative, detail)
    # Test catalogue availability independently of optional analytics runtime
    # behavior. These are temporary snapshot files, never repository assets.
    for relative in OPTIONAL_SCRIPTS.intersection(scripts):
        (site / relative).write_text(OPTIONAL_PLACEHOLDER, encoding="utf-8")
    test = ROOT / "tests" / "catalog-startup.test.cjs"
    if not test.is_file():
        raise CheckFailure("startup_test_unavailable", "local checker", "The startup smoke test is missing", unknown=True)
    result = subprocess.run(
        [node, "--test", "--test-name-pattern=the real script order", str(test)],
        env={**os.environ, "ATLAS_SITE_ROOT": str(site)}, capture_output=True,
        text=True, encoding="utf-8", timeout=30,
    )
    if result.returncode:
        # Test timings and temporary paths change; retain a stable fault signature.
        raise CheckFailure("catalogue_startup_failed", "index.html", "Downloaded page failed the home, menu and informational-route smoke test")
    return warnings


def release_evidence(site_url, html_sha, timeout, fetch):
    """A missing marker is expected on older releases; network trouble is not."""
    try:
        raw = fetch(urljoin(site_url, "release.json"), timeout)
        marker = json.loads(raw.decode("utf-8"))
        if not isinstance(marker, dict) or not re.fullmatch(r"[0-9a-f]{40}", str(marker.get("sourceSha", ""))):
            raise ValueError("Release marker has no valid sourceSha")
    except HTTPError as error:
        if error.code == 404:
            return {"releaseFingerprint": f"html:{html_sha}", "releaseMarker": "not_present"}
        return {"releaseMarker": "unavailable"}
    except (URLError, OSError, TimeoutError, ValueError, CheckFailure):
        return {"releaseMarker": "unavailable"}
    # A CDN can serve a new marker together with an older entry document. Do not
    # attribute that page to the marker's commit or trigger recovery from it.
    # Older markers did not contain a document hash and retain legacy behavior.
    if "htmlSha256" in marker:
        expected = marker["htmlSha256"]
        if not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
            raise CheckFailure("invalid_release_html_hash", "release.json",
                               "Release marker has no valid HTML SHA-256", unknown=True)
        if expected != html_sha:
            raise CheckFailure("release_html_mismatch", "release.json",
                               "Release marker does not identify the served HTML", unknown=True)
    return {"release": marker, "releaseFingerprint": f"release:{hashlib.sha256(raw).hexdigest()}:{html_sha}"}


def snapshot(site_url, timeout, fetch, javascript_check):
    evidence = {"status": "unknown", "url": site_url}
    try:
        html_bytes = fetch(site_url, timeout)
        evidence["htmlSha256"] = hashlib.sha256(html_bytes).hexdigest()
        evidence.update(release_evidence(site_url, evidence["htmlSha256"], timeout, fetch))
        html = html_bytes.decode("utf-8")
        parser = PageAssets()
        parser.feed(html)
        if not parser.assets:
            raise CheckFailure("no_page_assets", "index.html", "HTML contains no Atlas scripts or stylesheets")
        if len(parser.assets) > 32:
            raise CheckFailure("too_many_assets", "index.html", "More than 32 assets exceeds the checker scope", unknown=True)
        assets = [(asset_location(site_url, ref), is_script) for ref, is_script in parser.assets]
        def fetch_asset(item):
            try:
                return fetch(item[0][0], timeout)
            except (HTTPError, URLError, OSError, TimeoutError, CheckFailure) as error:
                return error

        with ThreadPoolExecutor(max_workers=4) as pool:
            contents = list(pool.map(fetch_asset, assets))
        with tempfile.TemporaryDirectory(prefix="atlas-live-check-") as directory:
            site = Path(directory)
            (site / "index.html").write_bytes(html_bytes)
            scripts, asset_evidence, versions_missing, warnings = [], [], [], []
            for ((url, relative), is_script), raw in zip(assets, contents):
                target = site / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                try:
                    if isinstance(raw, Exception):
                        raise raw
                    text = raw.decode("utf-8")
                    # Match generate_data.py's platform-independent text hashing.
                    digest = hashlib.sha256(text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")).hexdigest()
                    versions = parse_qs(urlsplit(url).query).get("v", [])
                    version = versions[0] if len(versions) == 1 else ""
                    if re.fullmatch(r"[0-9a-f]{16}", version):
                        if not digest.startswith(version):
                            raise CheckFailure("asset_hash_mismatch", relative, f"Advertised {version}; received {digest[:16]}")
                    else:
                        versions_missing.append(relative)
                except (CheckFailure, HTTPError, URLError, OSError, TimeoutError, UnicodeDecodeError) as error:
                    if not is_script or relative not in OPTIONAL_SCRIPTS:
                        raise
                    if isinstance(error, CheckFailure):
                        issue = error.issue
                    else:
                        code = f"http_{error.code}" if isinstance(error, HTTPError) else "invalid_utf8" if isinstance(error, UnicodeDecodeError) else "check_unavailable"
                        issue = {"code": code, "resource": relative, "detail": str(error)[:500]}
                    warnings.append(issue)
                    target.write_text(OPTIONAL_PLACEHOLDER, encoding="utf-8")
                    scripts.append(relative)
                    continue
                target.write_bytes(raw)
                asset_evidence.append({"path": relative, "sha256": digest})
                if is_script:
                    scripts.append(relative)
            if "data/data-v2.js" not in scripts:
                raise CheckFailure("public_data_not_loaded", "index.html", "The page does not reference the public data script")
            evidence["recordCount"] = validate_data((site / "data/data-v2.js").read_text(encoding="utf-8"))
            warnings.extend(javascript_check(site, scripts, parser.inline) or [])
            evidence.update(status="healthy", assets=asset_evidence, assetsWithoutContentHash=versions_missing,
                            optionalAssetWarnings=warnings)
    except CheckFailure as error:
        evidence.update(status="unknown" if error.unknown else "content_fault", issue=error.issue)
    except HTTPError as error:
        parsed = urlsplit(error.url)
        query = [(key, value) for key, value in parse_qsl(parsed.query, keep_blank_values=True) if key != "_atlas_probe"]
        resource = urlunsplit(parsed._replace(query=urlencode(query)))
        evidence.update(status="content_fault" if error.code in {404, 410} else "unknown",
                        issue={"code": f"http_{error.code}", "resource": resource, "detail": str(error.reason)})
    except UnicodeDecodeError:
        evidence.update(status="content_fault", issue={"code": "invalid_utf8", "resource": "page assets", "detail": "HTML or an asset is not UTF-8"})
    except (URLError, OSError, TimeoutError, subprocess.TimeoutExpired) as error:
        evidence.update(status="unknown", issue={"code": "check_unavailable", "resource": "network or local runtime", "detail": str(error)[:500]})
    return evidence


def check_site(site_url=DEFAULT_URL, *, timeout=8, retry_delay=2, fetch=fetch_bytes,
               javascript_check=check_javascript, sleep=time.sleep):
    attempts = [snapshot(site_url, timeout, fetch, javascript_check)]
    if attempts[0]["status"] != "healthy":
        sleep(retry_delay)
        attempts.append(snapshot(site_url, timeout, fetch, javascript_check))
    latest = attempts[-1]
    confirmed = len(attempts) == 2 and all(item["status"] == "content_fault" for item in attempts)
    confirmed = confirmed and attempts[0]["issue"] == attempts[1]["issue"]
    confirmed = confirmed and bool(attempts[0].get("releaseFingerprint")) and attempts[0].get("releaseFingerprint") == attempts[1].get("releaseFingerprint")
    exit_code = 0 if latest["status"] == "healthy" else 1 if confirmed else 2
    return {"status": ("healthy", "confirmed_content_fault", "unavailable_or_unconfirmed")[exit_code],
            "exitCode": exit_code, "checkedAt": datetime.now(timezone.utc).isoformat(),
            "url": site_url, "recordCount": latest.get("recordCount"),
            "releaseFingerprint": latest.get("releaseFingerprint"),
            "sourceSha": latest.get("release", {}).get("sourceSha"), "attempts": attempts}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--timeout", type=float, default=8)
    parser.add_argument("--retry-delay", type=float, default=2)
    args = parser.parse_args()
    if urlsplit(args.url).scheme not in {"http", "https"} or not 0 < args.timeout <= 30 or not 0 <= args.retry_delay <= 30:
        parser.error("Use an HTTP(S) URL, a timeout in (0, 30] and a retry delay in [0, 30]")
    result = check_site(args.url, timeout=args.timeout, retry_delay=args.retry_delay)
    print(json.dumps(result, ensure_ascii=False))
    return result["exitCode"]


if __name__ == "__main__":
    raise SystemExit(main())
