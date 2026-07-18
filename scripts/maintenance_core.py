"""Fetching, state handling and material change classification."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from maintenance_normalize import FetchResult, canonical_url, normalize_html

EVENTS = {"NEW", "CHANGED", "REMOVED", "UNREACHABLE", "SOURCE_CHANGED", "NO_CHANGE"}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def source_due(source: dict, state: dict, at: datetime | None = None) -> bool:
    frequency = source.get("schedule", {}).get("frequency", "daily")
    last = state.get("lastAttempt")
    if not last or frequency == "daily":
        return True
    at = at or datetime.now(timezone.utc)
    previous = datetime.fromisoformat(last.replace("Z", "+00:00"))
    days = {"weekly": 7, "monthly": 28}.get(frequency, 1)
    return (at - previous).total_seconds() >= days * 86400


class NetworkFetcher:
    def __init__(self, config: dict, sleeper=time.sleep):
        self.config = config
        self.sleep = sleeper

    def fetch(self, source: dict, previous: dict) -> FetchResult:
        net = self.config["network"]
        headers = {"User-Agent": net["userAgent"], "Accept": "text/html,application/xhtml+xml"}
        if previous.get("etag"):
            headers["If-None-Match"] = previous["etag"]
        if previous.get("modified"):
            headers["If-Modified-Since"] = previous["modified"]
        attempts = int(net["maxAttempts"])
        for index in range(attempts):
            try:
                request = Request(source["baseUrl"], headers=headers)
                with urlopen(request, timeout=int(net["timeoutSeconds"])) as response:
                    status = response.getcode()
                    body = response.read(5_000_000).decode(response.headers.get_content_charset() or "utf-8", "replace")
                    return FetchResult(True, status, response.geturl(), body,
                                       response.headers.get("ETag"), response.headers.get("Last-Modified"))
            except HTTPError as exc:
                if exc.code == 304:
                    return FetchResult(True, 304, source["baseUrl"])
                if exc.code in (404, 410):
                    return FetchResult(False, exc.code, source["baseUrl"], error=f"HTTP {exc.code}")
                error = f"HTTP {exc.code}"
            except (URLError, TimeoutError, OSError) as exc:
                detail = str(getattr(exc, "reason", exc)).replace("\n", " ")[:240]
                error = f"{type(exc).__name__}: {detail}"
            if index + 1 < attempts:
                waits = net.get("backoffSeconds", [1])
                self.sleep(waits[min(index, len(waits) - 1)])
        return FetchResult(False, 0, source["baseUrl"], error=error)


def classify(source: dict, previous: dict, result: FetchResult, config: dict) -> tuple[dict, dict]:
    """Return event and new state. The previous successful snapshot is never lost."""
    stamp = now_iso()
    state = dict(previous)
    state["lastAttempt"] = stamp
    state["sourceId"] = source["id"]
    if not result.ok:
        failures = int(previous.get("consecutiveFailures", 0)) + 1
        state.update({"consecutiveFailures": failures, "lastHttpStatus": result.status,
                      "lastError": result.error})
        threshold = int(config["classification"]["failureThreshold"])
        kind = "REMOVED" if result.status in (404, 410) and failures >= threshold else "UNREACHABLE"
        return ({"type": kind, "sourceId": source["id"], "detectedAt": stamp,
                 "reason": result.error, "failureCount": failures,
                 "actionable": kind == "REMOVED" or failures >= threshold}, state)

    if result.status == 304:
        state.update({"consecutiveFailures": 0, "lastSuccessfulCheck": stamp, "lastHttpStatus": 304,
                      "lastError": None})
        return ({"type": "NO_CHANGE", "sourceId": source["id"], "detectedAt": stamp,
                 "reason": "HTTP cache confirmed unchanged", "actionable": False}, state)

    snapshot = normalize_html(result.body, result.final_url, config)
    state.update({"consecutiveFailures": 0, "consecutiveStructuralFailures": 0,
                  "lastSuccessfulCheck": stamp, "lastHttpStatus": result.status,
                  "lastError": None, "etag": result.etag, "modified": result.modified,
                  "finalUrl": canonical_url(result.final_url), "snapshot": snapshot})
    old = previous.get("snapshot")
    if not old:
        return ({"type": "NEW", "sourceId": source["id"], "detectedAt": stamp,
                 "reason": "Initial baseline stored; no content proposal created", "actionable": False,
                 "current": snapshot}, state)

    old_url = canonical_url(previous.get("finalUrl") or source["baseUrl"])
    new_url = canonical_url(result.final_url)
    minimum = int(config["classification"]["minimumWords"])
    ratio = snapshot["wordCount"] / max(1, old.get("wordCount", 1))
    if old_url != new_url or snapshot["wordCount"] < minimum or ratio < config["classification"]["structureDropRatio"]:
        state.update({
            "snapshot": old,
            "finalUrl": previous.get("finalUrl") or source["baseUrl"],
            "lastSuccessfulCheck": previous.get("lastSuccessfulCheck"),
            "candidateSnapshot": snapshot,
            "candidateFinalUrl": new_url,
            "consecutiveStructuralFailures": int(previous.get("consecutiveStructuralFailures", 0)) + 1,
        })
        return ({"type": "SOURCE_CHANGED", "sourceId": source["id"], "detectedAt": stamp,
                 "reason": "Redirect or extraction structure changed materially", "actionable": True,
                 "previous": old, "current": snapshot}, state)

    old_units = {item["url"]: item for item in old.get("units", [])}
    new_units = {item["url"]: item for item in snapshot.get("units", [])}
    pending = dict(previous.get("pendingMissing", {}))
    confirmed_removed = []
    threshold = int(config["classification"]["missingLinkThreshold"])
    for url in list(pending):
        if url in new_units:
            pending.pop(url, None)
            continue
        pending[url]["count"] += 1
        if pending[url]["count"] >= threshold:
            confirmed_removed.append(pending.pop(url)["unit"])
    state["pendingMissing"] = pending

    if snapshot["contentHash"] == old.get("contentHash") and not confirmed_removed:
        return ({"type": "NO_CHANGE", "sourceId": source["id"], "detectedAt": stamp,
                 "reason": "Normalized content unchanged", "actionable": False}, state)

    added = [new_units[url] for url in sorted(new_units.keys() - old_units.keys())]
    newly_missing = [old_units[url] for url in sorted(old_units.keys() - new_units.keys())]
    for item in newly_missing:
        pending.setdefault(item["url"], {"count": 1, "unit": item})
    state["pendingMissing"] = pending
    removed = confirmed_removed
    old_deadlines = [item.get("dateText") for item in old.get("deadlineFacts", [])]
    new_deadlines = [item.get("dateText") for item in snapshot.get("deadlineFacts", [])]
    changed_deadlines = old_deadlines != new_deadlines
    if not added and not removed and not changed_deadlines:
        reason = ("Source link absence awaits repeated successful confirmation" if newly_missing
                  else "Only non-structural body text changed")
        return ({"type": "NO_CHANGE", "sourceId": source["id"], "detectedAt": stamp,
                 "reason": reason, "actionable": False}, state)
    return ({"type": "CHANGED", "sourceId": source["id"], "detectedAt": stamp,
             "reason": "Relevant links or deadline facts changed", "actionable": True,
             "addedUnits": added, "removedUnits": removed,
             "deadlineChanged": changed_deadlines, "previous": old, "current": snapshot}, state)


def run_checks(sources: list[dict], states: dict, config: dict, fetcher=None) -> tuple[list[dict], dict]:
    fetcher = fetcher or NetworkFetcher(config)
    events = []
    new_states = dict(states)
    for source in sources:
        if not source.get("enabled", True):
            continue
        previous = new_states.get(source["id"], {})
        if not source_due(source, previous):
            continue
        event, state = classify(source, previous, fetcher.fetch(source, previous), config)
        assert event["type"] in EVENTS
        events.append(event)
        new_states[source["id"]] = state
        delay = float(config["network"].get("minimumDelaySeconds", 0))
        if delay and isinstance(fetcher, NetworkFetcher):
            fetcher.sleep(delay)
    return events, new_states
