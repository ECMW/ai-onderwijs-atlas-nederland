"""Live-monitor decisions tested without network requests or repository writes."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("check_live_site", ROOT / "scripts/check_live_site.py")
live = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(live)
URL = "https://example.test/atlas/"


def fixture(records=None, count=None):
    if records is None:
        records = [{"id": "record-1", "title": "Existing offer", "recordType": "training",
                    "verificationStatus": "verified",
                    "sourceUrls": [{"sourceType": "official", "url": "https://example.test/source"}]}]
    data = {"metadata": {"recordCount": len(records) if count is None else count}, "records": records}
    files = {"data/data-v2.js": ("window.ATLAS_RECORDS=" + json.dumps(data) + ";\n").encode(),
             "catalog.js": b"window.loaded = true;\n", "catalog.css": b"body { color: black; }\n"}
    html = "<main id=inhoud></main>"
    for name, body in files.items():
        ref = name + "?v=" + hashlib.sha256(body).hexdigest()[:16]
        html += f'<script src="{ref}"></script>' if name.endswith(".js") else f'<link rel="stylesheet" href="{ref}">'
    return {"index.html": html.encode(), "release.json": json.dumps({"sourceSha": "a" * 40, "workflowRunId": "123"}).encode(), **files}


class LiveSiteTests(unittest.TestCase):
    def run_check(self, snapshots, *, javascript_check=lambda *args: None):
        self.calls = []
        index = -1

        def fetch(url, timeout):
            nonlocal index
            self.calls.append(url)
            if url == URL:
                index += 1
            value = snapshots[min(index, len(snapshots) - 1)]
            if isinstance(value, Exception):
                raise value
            key = urlsplit(url).path.removeprefix("/atlas/") or "index.html"
            result = value[key]
            if isinstance(result, Exception):
                raise result
            return result

        return live.check_site(URL, fetch=fetch, javascript_check=javascript_check, sleep=lambda _: None)

    def test_healthy_snapshot_is_fetched_once_and_temp_files_are_removed(self):
        temporary = []

        def inspect(site, scripts, inline):
            temporary.append(site)
            self.assertTrue((site / "data/data-v2.js").is_file())
            self.assertEqual(scripts, ["data/data-v2.js", "catalog.js"])

        result = self.run_check([fixture()], javascript_check=inspect)
        self.assertEqual(result["exitCode"], 0)
        self.assertEqual(result["recordCount"], 1)
        self.assertEqual(self.calls.count(URL), 1)
        self.assertFalse(temporary[0].exists())

    def test_real_request_adapter_bypasses_cache_and_preserves_asset_version(self):
        with patch.object(live, "urlopen") as open_url:
            open_url.return_value.__enter__.return_value.read.return_value = b"public asset"
            for _ in range(2):
                self.assertEqual(live.fetch_bytes(URL + "catalog.js?v=abc", 3.5), b"public asset")
        requests = [call.args[0] for call in open_url.call_args_list]
        queries = [parse_qs(urlsplit(request.full_url).query) for request in requests]
        self.assertEqual(queries[0]["v"], ["abc"])
        self.assertNotEqual(queries[0]["_atlas_probe"], queries[1]["_atlas_probe"])
        self.assertEqual(requests[0].get_header("Cache-control"), "no-cache")
        self.assertTrue(all(call.kwargs["timeout"] == 3.5 for call in open_url.call_args_list))

    def test_zero_records_requires_two_confirming_snapshots(self):
        result = self.run_check([fixture(records=[])])
        self.assertEqual(result["exitCode"], 1)
        self.assertEqual(result["attempts"][0]["issue"]["code"], "empty_catalogue")
        self.assertEqual(self.calls.count(URL), 2)

    def test_editorially_excluded_record_is_rejected_in_live_projection(self):
        excluded = {"id": "excluded", "title": "Software", "recordType": "product",
                    "verificationStatus": "verified",
                    "sourceUrls": [{"sourceType": "official", "url": "https://example.test/software"}],
                    "publicationExclusion": {"reason": "Outside scope", "decidedOn": "2026-09-09"}}
        result = self.run_check([fixture(records=[excluded])])
        self.assertEqual(result["exitCode"], 1)
        self.assertEqual(result["attempts"][0]["issue"]["code"], "ineligible_public_record")

    def test_count_mismatch_duplicate_ids_and_unverified_records_are_faults(self):
        record = json.loads(fixture()["data/data-v2.js"].decode().split("=", 1)[1].rstrip(";\n"))["records"][0]
        unverified = {**record, "verificationStatus": "unverified"}
        for files, expected in [(fixture(count=2), "record_count_mismatch"),
                                (fixture(records=[record, record]), "duplicate_public_ids"),
                                (fixture(records=[unverified]), "ineligible_public_record")]:
            with self.subTest(expected=expected):
                result = self.run_check([files])
                self.assertEqual(result["exitCode"], 1)
                self.assertEqual(result["attempts"][-1]["issue"]["code"], expected)

    def test_mixed_cached_asset_that_recovers_on_retry_is_healthy(self):
        stale = fixture()
        stale["catalog.js"] = b"window.loaded = false;\n"
        result = self.run_check([stale, fixture()])
        self.assertEqual(result["exitCode"], 0)
        self.assertEqual(result["attempts"][0]["issue"]["code"], "asset_hash_mismatch")

    def test_persistent_hash_mismatch_is_confirmed(self):
        files = fixture()
        files["catalog.js"] = b"window.loaded = false;\n"
        self.assertEqual(self.run_check([files])["exitCode"], 1)

    def test_network_failures_are_unknown_and_can_recover(self):
        error = URLError("timed out")
        self.assertEqual(self.run_check([error])["exitCode"], 2)
        self.assertEqual(self.run_check([error, fixture()])["exitCode"], 0)
        self.assertEqual(self.run_check([error, fixture(records=[])])["exitCode"], 2)

    def test_different_content_faults_do_not_trigger_restore(self):
        result = self.run_check([fixture(records=[]), fixture(count=3)])
        self.assertEqual(result["exitCode"], 2)

    def test_same_fault_across_different_releases_is_not_confirmed(self):
        first, second = fixture(records=[]), fixture(records=[])
        second["release.json"] = json.dumps({"sourceSha": "b" * 40}).encode()
        self.assertEqual(self.run_check([first, second])["exitCode"], 2)

    def test_old_release_without_marker_uses_html_fingerprint(self):
        files = fixture(records=[])
        files["release.json"] = HTTPError(URL + "release.json", 404, "Not Found", {}, None)
        result = self.run_check([files])
        self.assertEqual(result["exitCode"], 1)
        self.assertTrue(result["releaseFingerprint"].startswith("html:"))

    def test_unavailable_release_marker_prevents_automatic_restore(self):
        files = fixture(records=[])
        files["release.json"] = URLError("timed out")
        self.assertEqual(self.run_check([files])["exitCode"], 2)

    def test_missing_asset_is_content_fault_but_server_error_is_unknown(self):
        for status, expected in [(404, 1), (503, 2), (429, 2)]:
            files = fixture()
            files["catalog.js"] = HTTPError(URL + "catalog.js", status, "server response", {}, None)
            self.assertEqual(self.run_check([files])["exitCode"], expected)

    def test_optional_analytics_failure_is_visible_without_triggering_recovery(self):
        expected = b"window.optional = true;\n"
        version = hashlib.sha256(expected).hexdigest()[:16]
        reference = f"analytics.js?v={version}"
        cases = [
            (HTTPError(URL + reference, 404, "Not Found", {}, None), "http_404"),
            (URLError("analytics unavailable"), "check_unavailable"),
            (b"window.optional = false;\n", "asset_hash_mismatch"),
            (b"\xff", "invalid_utf8"),
        ]
        for value, expected_code in cases:
            with self.subTest(expected_code=expected_code):
                files = fixture()
                files["index.html"] += f'<script src="{reference}"></script>'.encode()
                files["analytics.js"] = value
                result = self.run_check([files])
                self.assertEqual(result["exitCode"], 0)
                self.assertEqual(len(result["attempts"]), 1)
                warning = result["attempts"][0]["optionalAssetWarnings"][0]
                self.assertEqual(warning["code"], expected_code)
                self.assertEqual(warning["resource"], "analytics.js")

    def test_optional_failure_does_not_hide_an_empty_catalogue(self):
        files = fixture(records=[])
        files["index.html"] += b'<script src="analytics.js"></script>'
        files["analytics.js"] = HTTPError(URL + "analytics.js", 404, "Not Found", {}, None)
        result = self.run_check([files])
        self.assertEqual(result["exitCode"], 1)
        self.assertEqual(result["attempts"][-1]["issue"]["code"], "empty_catalogue")

    @unittest.skipUnless(shutil.which("node"), "Node is required for the real catalogue smoke test")
    def test_broken_optional_script_does_not_fail_real_catalogue_smoke(self):
        files = {"index.html": (ROOT / "index.html").read_bytes(),
                 "release.json": fixture()["release.json"]}
        parser = live.PageAssets()
        parser.feed(files["index.html"].decode("utf-8"))
        for reference, _ in parser.assets:
            _, relative = live.asset_location(URL, reference)
            files[relative] = (ROOT / relative).read_bytes()
            if relative == "analytics.js":
                analytics_reference = reference
        files["analytics.js"] = b"window.optional = {;\n"
        version = hashlib.sha256(files["analytics.js"]).hexdigest()[:16]
        files["index.html"] = files["index.html"].replace(
            analytics_reference.encode(), f"analytics.js?v={version}".encode())
        result = self.run_check([files], javascript_check=live.check_javascript)
        self.assertEqual(result["exitCode"], 0)
        self.assertGreater(result["recordCount"], 0)
        warning = result["attempts"][0]["optionalAssetWarnings"][0]
        self.assertEqual(warning["code"], "javascript_syntax")
        self.assertEqual(warning["resource"], "analytics.js")

    def test_external_assets_are_not_fetched_or_treated_as_known_fault(self):
        files = fixture()
        files["index.html"] += b'<script src="https://another.test/script.js"></script>'
        self.assertEqual(self.run_check([files])["exitCode"], 2)
        self.assertTrue(all(url.startswith(URL) for url in self.calls))

    def test_inline_executable_scripts_exclude_structured_data(self):
        parser = live.PageAssets()
        parser.feed('<script type="application/ld+json">{}</script><script>window.ok=true;</script>')
        self.assertEqual(parser.inline, ["window.ok=true;"])

    def test_no_data_script_in_page_is_a_confirmed_fault(self):
        files = fixture()
        files["index.html"] = b'<script src="catalog.js"></script>'
        self.assertEqual(self.run_check([files])["exitCode"], 1)

    @unittest.skipUnless(shutil.which("node"), "Node is required for real JavaScript syntax checks")
    def test_invalid_javascript_is_detected_even_with_matching_content_hash(self):
        files = fixture()
        old_hash = hashlib.sha256(files["catalog.js"]).hexdigest()[:16]
        files["catalog.js"] = b"window.loaded = {;\n"
        new_hash = hashlib.sha256(files["catalog.js"]).hexdigest()[:16]
        files["index.html"] = files["index.html"].replace(old_hash.encode(), new_hash.encode())
        result = self.run_check([files], javascript_check=live.check_javascript)
        self.assertEqual(result["exitCode"], 1)
        self.assertEqual(result["attempts"][-1]["issue"]["code"], "javascript_syntax")


if __name__ == "__main__":
    unittest.main()
