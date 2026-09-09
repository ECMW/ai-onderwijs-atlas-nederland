#!/usr/bin/env python3
"""Strictly admitted issue -> immutable tested bot PR -> ordinary protected merge.

Only trusted main code executes. Candidate files are read as data through the API;
the privileged publisher never checks out a candidate or bypasses GitHub rules.
"""
from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BOT = "github-actions[bot]"
FILES = {"data/records.json", "data/metadata.json", "data/data-v2.js", "data/search-index.json", "index.html"}
WORKFLOWS = ("validate-contribution.yml", "quality-gate.yml")
BRANCH = re.compile(r"codex/inzending-(\d+)-([0-9a-f]{12})-([0-9a-f]{12})")
SHA = re.compile(r"[0-9a-f]{40}")
MARKER, STATUS_MARKER = "atlas-submission-v1", "atlas-submission-status"
LABELS = {"atlas:needs-info": "D4A72C", "atlas:publication-checks": "0969DA", "atlas:accepted": "1A7F37"}


def body_hash(body):
    return hashlib.sha256((body or "").encode("utf-8")).hexdigest()


def marker(data, kind=MARKER):
    encoded = base64.urlsafe_b64encode(json.dumps(data, sort_keys=True).encode()).decode().rstrip("=")
    return f"<!-- {kind}:{encoded} -->"


def read_marker(body, kind=MARKER):
    match = re.search(r"<!-- " + re.escape(kind) + r":([A-Za-z0-9_-]+) -->", body or "")
    if not match:
        return {}
    try:
        data = json.loads(base64.urlsafe_b64decode(match[1] + "=" * (-len(match[1]) % 4)))
        return data if isinstance(data, dict) else {}
    except (ValueError, UnicodeError):
        return {}


def issue_matches(issue, number, digest):
    return (issue.get("number") == number and issue.get("state") == "open" and "pull_request" not in issue
            and any(label.get("name") == "atlas-aanvulling" for label in issue.get("labels", []))
            and body_hash(issue.get("body")) == digest)


def append_only(base, candidate, record_id):
    return (isinstance(base, list) and isinstance(candidate, list) and len(candidate) == len(base) + 1
            and candidate[:-1] == base and isinstance(candidate[-1], dict) and candidate[-1].get("id") == record_id
            and record_id not in {item.get("id") for item in base})


def other_checks_pass(checks, skipped_screen_suites=()):
    """Only the intentionally bypassed legacy bot screener may be skipped."""
    for check in checks:
        if check.get("status") == "completed" and check.get("conclusion") == "success":
            continue
        if (check.get("status") == "completed" and check.get("conclusion") == "skipped"
                and check.get("name") == "screen" and check.get("app", {}).get("slug") == "github-actions"
                and check.get("check_suite", {}).get("id") in skipped_screen_suites):
            continue
        return False
    return True


def source_readmission(base_records, candidate_records, reviewer=None):
    """Recheck public source evidence immediately before merge, as data only."""
    if reviewer is None:
        from contribution_quality import review_external_submission
        reviewer = review_external_submission
    pending = copy.deepcopy(candidate_records)
    pending[-1]["verificationStatus"] = "needs_review"
    pending[-1]["lastVerified"] = None
    sources = json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))
    report = reviewer(base_records, pending, sources)
    return report.get("eligible") is True and report.get("autoPublishEligible") is True


def publication_decision(repo, run, pr, metadata, issue, changed, current_main, validations, base_records, candidate_records):
    """Pure fail-closed decision, independently testable without GitHub writes."""
    stop = lambda reason: {"action": "stop", "reason": reason}
    branch = run.get("head_branch", "")
    if (run.get("event") != "workflow_dispatch" or run.get("conclusion") != "success"
            or run.get("head_repository", {}).get("full_name") != repo or not BRANCH.fullmatch(branch)):
        return stop("Not a successful dispatched validation of an owned submission branch")
    if (pr.get("user", {}).get("login") != BOT or pr.get("draft") or pr.get("state") != "open"
            or pr.get("head", {}).get("repo", {}).get("full_name") != repo
            or pr.get("base", {}).get("repo", {}).get("full_name") != repo
            or pr.get("base", {}).get("ref") != "main" or pr.get("head", {}).get("ref") != branch
            or pr.get("head", {}).get("sha") != run.get("head_sha")):
        return stop("PR identity, repository or validated head changed")
    number, digest, baseline = metadata.get("issue"), metadata.get("bodySha", ""), metadata.get("baseSha", "")
    if (type(number) is not int or number <= 0 or not re.fullmatch(r"[0-9a-f]{64}", digest)
            or not SHA.fullmatch(baseline) or metadata.get("headSha") != run.get("head_sha")
            or not isinstance(metadata.get("recordId"), str)
            or branch != f"codex/inzending-{number}-{digest[:12]}-{baseline[:12]}"):
        return stop("Immutable submission provenance is missing or mismatched")
    if not issue_matches(issue, number, digest):
        return stop("Issue was closed, relabeled or edited after admission")
    if (len(changed) != len(FILES) or {item.get("filename") for item in changed} != FILES
            or any(item.get("status") != "modified" for item in changed)
            or not append_only(base_records, candidate_records, metadata["recordId"])):
        return stop("Candidate changes more than one new record or the five generated public files")
    if current_main != baseline:
        return {"action": "reprepare", "reason": "Main changed; re-admit and revalidate on the new base"}
    for filename in WORKFLOWS:
        check = validations.get(filename)
        if not check or check.get("status") != "completed":
            return {"action": "wait", "reason": f"Waiting for {filename}"}
        if (check.get("workflow_path") != f".github/workflows/{filename}" or check.get("event") != "workflow_dispatch"
                or check.get("head_sha") != run.get("head_sha") or check.get("head_branch") != branch
                or check.get("head_repository", {}).get("full_name") != repo
                or check.get("conclusion") != "success" or not check.get("jobs")
                or any(job.get("conclusion") != "success" for job in check["jobs"])):
            return stop("A required exact-commit validation did not pass")
    return {"action": "merge", "reason": "Admission and both exact-commit validations passed"}


class GitHub:
    def __init__(self, repo, token):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo) or not token:
            raise ValueError("GITHUB_REPOSITORY and GH_TOKEN are required")
        self.repo, self.token = repo, token

    def request(self, method, path, data=None, missing=False):
        request = Request(f"https://api.github.com/repos/{self.repo}/{path}", method=method,
                          data=json.dumps(data).encode() if data is not None else None,
                          headers={"Authorization": f"Bearer {self.token}", "Accept": "application/vnd.github+json",
                                   "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28"})
        try:
            with urlopen(request, timeout=30) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except HTTPError as error:
            if missing and error.code == 404:
                return None
            detail = error.read().decode("utf-8", errors="replace")[:700]
            raise RuntimeError(f"GitHub {method} {path.split('?')[0]}: HTTP {error.code}: {detail}") from error

    def main_sha(self):
        return self.request("GET", "git/ref/heads/main")["object"]["sha"]

    def issue(self, number):
        return self.request("GET", f"issues/{number}")

    def dispatch(self, workflow, ref="main", inputs=None):
        self.request("POST", f"actions/workflows/{workflow}/dispatches", {"ref": ref, "inputs": inputs or {}})

    def comments(self, number):
        comments = []
        for page in range(1, 11):
            batch = self.request("GET", f"issues/{number}/comments?per_page=100&page={page}")
            comments.extend(batch)
            if len(batch) < 100:
                return comments
        raise RuntimeError("Issue comment history exceeds the bounded scan")

    def status(self, number, label, text, state):
        if self.request("GET", "labels/" + quote(label, safe=""), missing=True) is None:
            self.request("POST", "labels", {"name": label, "color": LABELS[label]})
        self.request("POST", f"issues/{number}/labels", {"labels": [label]})
        for other in LABELS.keys() - {label}:
            self.request("DELETE", f"issues/{number}/labels/" + quote(other, safe=""), missing=True)
        body = marker(state, STATUS_MARKER) + "\n" + text
        previous = next((item for item in self.comments(number) if item.get("user", {}).get("login") == BOT
                         and read_marker(item.get("body"), STATUS_MARKER)), None)
        self.request("PATCH" if previous else "POST", f"issues/comments/{previous['id']}" if previous else f"issues/{number}/comments", {"body": body})

    def prs(self, branch):
        return self.request("GET", "pulls?" + urlencode({"head": self.repo.split("/")[0] + ":" + branch,
                                                        "base": "main", "state": "all", "per_page": 100}))

    def records(self, sha):
        result = self.request("GET", "contents/data/records.json?" + urlencode({"ref": sha}))
        if result.get("encoding") != "base64":
            raise RuntimeError("Canonical records exceed the bounded contents API response")
        return json.loads(base64.b64decode(result["content"]))


def trusted_command(command, **kwargs):
    env = {key: value for key, value in os.environ.items() if key not in {"GH_TOKEN", "GITHUB_TOKEN"}}
    env.update(kwargs.pop("env", {}))
    env["PYTHONUTF8"] = "1"
    return subprocess.run(command, cwd=ROOT, env=env, text=True, encoding="utf-8", **kwargs)


def dispatch_validations(api, branch):
    for workflow in WORKFLOWS:
        api.dispatch(workflow, ref=branch)


def prepare(api, number):
    issue = api.issue(number)
    digest = body_hash(issue.get("body"))
    if not issue_matches(issue, number, digest):
        return {"action": "stop", "reason": "Not an open Atlas addition"}
    for comment in api.comments(number):
        state = read_marker(comment.get("body"), STATUS_MARKER)
        if comment.get("user", {}).get("login") == BOT and state.get("bodySha") == digest and state.get("status") == "deployment_requested":
            return {"action": "already_processed", "pr": state.get("pr")}
    baseline = trusted_command(["git", "rev-parse", "HEAD"], capture_output=True, check=True).stdout.strip()
    if api.main_sha() != baseline:
        api.dispatch("process-atlas-submission.yml", inputs={"issue_number": str(number)})
        return {"action": "reprepare"}
    branch = f"codex/inzending-{number}-{digest[:12]}-{baseline[:12]}"
    existing = api.prs(branch)
    if existing:
        if len(existing) != 1 or existing[0].get("user", {}).get("login") != BOT:
            raise RuntimeError("Submission branch has unexpected PR ownership")
        prior, metadata = existing[0], read_marker(existing[0].get("body"))
        if prior["state"] != "open":
            return {"action": "already_processed", "pr": prior["number"]}
        if metadata.get("bodySha") != digest or metadata.get("baseSha") != baseline or metadata.get("headSha") != prior["head"]["sha"]:
            raise RuntimeError("Existing immutable submission branch changed")
        dispatch_validations(api, branch)
        return {"action": "validation_requested", "pr": prior["number"]}
    original = json.loads((ROOT / "data/records.json").read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory(prefix="atlas-submission-") as directory:
        report_path = Path(directory) / "admission.json"
        result = trusted_command([sys.executable, "scripts/import_issue_submission.py", "--report-json", str(report_path)],
                                 env={"ATLAS_ISSUE_BODY": issue.get("body") or "", "ATLAS_ISSUE_NUMBER": str(number)}, capture_output=True)
        report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.is_file() else {}
        added = report.get("addedIds", [])
        candidate = json.loads((ROOT / "data/records.json").read_text(encoding="utf-8"))
        if not (result.returncode == 0 and report.get("eligible") is True and report.get("autoPublishEligible") is True
                and isinstance(added, list) and len(added) == 1 and append_only(original, candidate, added[0])):
            errors = report.get("errors") or ["De broncontrole kon niet volledig worden afgerond."]
            api.status(number, "atlas:needs-info", "Nog niet gepubliceerd.\n\n" + "\n".join("- " + str(item) for item in errors[:8]),
                       {"bodySha": digest, "status": "needs_info"})
            return {"action": "needs_info"}
        if not shutil.which("node"):
            raise RuntimeError("Node.js is required; JavaScript tests may not be skipped")
        try:
            for command in ([sys.executable, "scripts/generate_data.py"], [sys.executable, "scripts/validate_data.py"],
                            [sys.executable, "scripts/quality_gate.py", "--strict", "--output", str(Path(directory) / "quality.json")],
                            [sys.executable, "-m", "unittest", "discover", "tests"]):
                trusted_command(command, check=True)
        except subprocess.CalledProcessError:
            api.status(number, "atlas:needs-info", "De broncontrole is geslaagd, maar een technische publicatiecontrole is mislukt. Er is niets gepubliceerd; de beheerder kan het controleverslag bekijken.",
                       {"bodySha": digest, "status": "technical_check_failed"})
            raise
    changed = set(trusted_command(["git", "diff", "--name-only"], capture_output=True, check=True).stdout.splitlines())
    if changed != FILES:
        raise RuntimeError("Admission must change exactly the five generated public data paths")
    if not issue_matches(api.issue(number), number, digest):
        return {"action": "stop", "reason": "Issue changed during admission"}
    if api.main_sha() != baseline:
        api.dispatch("process-atlas-submission.yml", inputs={"issue_number": str(number)})
        return {"action": "reprepare"}
    metadata = {"issue": number, "bodySha": digest, "baseSha": baseline, "recordId": added[0]}
    reference = api.request("GET", "git/ref/heads/" + branch, missing=True)
    if reference:
        commit = api.request("GET", "git/commits/" + reference["object"]["sha"])
        if read_marker(commit.get("message")) != metadata or [item["sha"] for item in commit["parents"]] != [baseline]:
            raise RuntimeError("Refusing to replace an unexpected existing immutable branch")
        head = reference["object"]["sha"]
    else:
        base_commit = api.request("GET", "git/commits/" + baseline)
        tree = api.request("POST", "git/trees", {"base_tree": base_commit["tree"]["sha"], "tree": [
            {"path": name, "mode": "100644", "type": "blob", "content": (ROOT / name).read_text(encoding="utf-8")} for name in sorted(FILES)]})
        commit = api.request("POST", "git/commits", {"message": f"Add source-checked Atlas submission #{number}\n\n" + marker(metadata),
                                                     "tree": tree["sha"], "parents": [baseline]})
        head = commit["sha"]
        api.request("POST", "git/refs", {"ref": "refs/heads/" + branch, "sha": head})
    metadata["headSha"] = head
    body = (f"Voegt uitsluitend het strikt brongecontroleerde record uit #{number} toe, met de vijf afgeleide publieke bestanden. "
            "Samenvoegen volgt alleen als de inzending ongewijzigd is en beide onafhankelijke controles deze exacte commit goedkeuren.\n\n" + marker(metadata))
    pr = api.request("POST", "pulls", {"title": f"Atlas-aanvulling #{number}: brongecontroleerd aanbod", "head": branch, "base": "main", "body": body})
    api.status(number, "atlas:publication-checks", f"De strikte broncontrole is geslaagd. Toevoeging #{pr['number']} wordt onafhankelijk getest; publicatie volgt uitsluitend bij geslaagde controles.",
               {"bodySha": digest, "status": "validating", "pr": pr["number"]})
    dispatch_validations(api, branch)
    return {"action": "validation_requested", "pr": pr["number"], "headSha": head}


def validation_runs(api, sha, branch):
    result = {}
    for filename in WORKFLOWS:
        workflow = api.request("GET", f"actions/workflows/{filename}")
        if workflow.get("path") != f".github/workflows/{filename}":
            raise RuntimeError("Required validation workflow path changed")
        query = urlencode({"head_sha": sha, "branch": branch, "event": "workflow_dispatch", "per_page": 100})
        runs = api.request("GET", f"actions/workflows/{workflow['id']}/runs?{query}")["workflow_runs"]
        runs = [run for run in runs if run.get("head_sha") == sha and run.get("head_branch") == branch]
        if runs:
            latest = max(runs, key=lambda item: item["id"])
            latest["workflow_path"] = workflow["path"]
            latest["jobs"] = api.request("GET", f"actions/runs/{latest['id']}/jobs?per_page=100")["jobs"]
            result[filename] = latest
    return result


def request_deployment(api, pr, metadata):
    number, digest = metadata["issue"], metadata["bodySha"]
    for comment in api.comments(number):
        state = read_marker(comment.get("body"), STATUS_MARKER)
        if (comment.get("user", {}).get("login") == BOT and state.get("bodySha") == digest
                and state.get("pr") == pr["number"] and state.get("status") == "deployment_requested"):
            return {"action": "already_processed", "pr": pr["number"]}
    api.dispatch("deploy-pages.yml")
    api.status(number, "atlas:accepted", f"De broncontrole en beide publicatiecontroles zijn geslaagd. Toevoeging #{pr['number']} is verwerkt en de websitepublicatie is aangevraagd.",
               {"bodySha": digest, "status": "deployment_requested", "pr": pr["number"]})
    return {"action": "deployment_requested", "pr": pr["number"]}


def publish(api, event):
    trigger = event.get("workflow_run", {})
    if not BRANCH.fullmatch(trigger.get("head_branch", "")) or trigger.get("event") != "workflow_dispatch":
        return {"action": "stop", "reason": "Not an owned submission validation"}
    workflow = api.request("GET", f"actions/workflows/{trigger['workflow_id']}")
    if workflow.get("path") not in {f".github/workflows/{name}" for name in WORKFLOWS}:
        return {"action": "stop", "reason": "Unexpected triggering workflow"}
    run = api.request("GET", f"actions/runs/{trigger['id']}")
    prs = api.prs(run["head_branch"])
    if len(prs) != 1:
        return {"action": "stop", "reason": "Expected exactly one bot PR"}
    pr = api.request("GET", f"pulls/{prs[0]['number']}")
    metadata = read_marker(pr.get("body"))
    if type(metadata.get("issue")) is not int or metadata["issue"] <= 0 or not SHA.fullmatch(str(metadata.get("baseSha", ""))):
        return {"action": "stop", "reason": "Missing bot admission provenance"}
    commits = api.request("GET", f"pulls/{pr['number']}/commits?per_page=2")
    if (len(commits) != 1 or commits[0].get("sha") != run["head_sha"]
            or [item["sha"] for item in commits[0].get("parents", [])] != [metadata["baseSha"]]
            or read_marker(commits[0].get("commit", {}).get("message")) != {key: value for key, value in metadata.items() if key != "headSha"}):
        return {"action": "stop", "reason": "Candidate is not the single immutable admission commit"}
    changed = api.request("GET", f"pulls/{pr['number']}/files?per_page=100")
    base_records, candidate_records = api.records(metadata["baseSha"]), api.records(run["head_sha"])
    # A retry after merge must still prove the original candidate and validation.
    already_merged = pr.get("merged") is True
    decision = publication_decision(api.repo, run, {**pr, "state": "open"} if already_merged else pr,
                                    metadata, api.issue(metadata["issue"]), changed, metadata["baseSha"] if already_merged else api.main_sha(),
                                    validation_runs(api, run["head_sha"], run["head_branch"]),
                                    base_records, candidate_records)
    if already_merged:
        return request_deployment(api, pr, metadata) if decision["action"] == "merge" else decision
    if decision["action"] == "reprepare":
        api.dispatch("process-atlas-submission.yml", inputs={"issue_number": str(metadata["issue"])})
        api.request("PATCH", f"pulls/{pr['number']}", {"state": "closed"})
        return decision
    if decision["action"] != "merge":
        return decision
    checks = api.request("GET", f"commits/{run['head_sha']}/check-runs?per_page=100")
    skipped_screen_suites = set()
    if any(check.get("conclusion") == "skipped" for check in checks["check_runs"]):
        screen = api.request("GET", "actions/workflows/auto-review-contribution.yml")
        if screen.get("path") == ".github/workflows/auto-review-contribution.yml":
            query = urlencode({"head_sha": run["head_sha"], "per_page": 100})
            screening_runs = api.request("GET", f"actions/workflows/{screen['id']}/runs?{query}")["workflow_runs"]
            skipped_screen_suites = {item.get("check_suite_id") for item in screening_runs
                                    if item.get("head_sha") == run["head_sha"] and item.get("event") == "pull_request_target"}
    if checks.get("total_count", 0) > 100 or not other_checks_pass(checks["check_runs"], skipped_screen_suites):
        return {"action": "stop", "reason": "Another actual check is pending, skipped or unsuccessful"}
    statuses = api.request("GET", f"commits/{run['head_sha']}/status")
    if statuses.get("statuses") and statuses.get("state") != "success":
        return {"action": "stop", "reason": "A commit status did not pass"}
    if not source_readmission(base_records, candidate_records):
        api.status(metadata["issue"], "atlas:needs-info", "De laatste bronhercontrole vlak voor publicatie is niet volledig geslaagd. Er is niets gepubliceerd; de bron of onderbouwing vraagt opnieuw controle.",
                   {"bodySha": metadata["bodySha"], "status": "source_recheck_failed", "pr": pr["number"]})
        return {"action": "stop", "reason": "Current source evidence no longer fully admits the candidate"}
    if api.main_sha() != metadata["baseSha"] or not issue_matches(api.issue(metadata["issue"]), metadata["issue"], metadata["bodySha"]):
        return {"action": "stop", "reason": "Main or issue changed immediately before merge"}
    try:
        merged = api.request("PUT", f"pulls/{pr['number']}/merge", {"sha": run["head_sha"], "merge_method": "squash"})
    except RuntimeError:
        # Strict branch protection rejects a concurrent advance of main.
        # Rebuild from that new base; never retry with a bypass or force push.
        if api.main_sha() != metadata["baseSha"] and issue_matches(api.issue(metadata["issue"]), metadata["issue"], metadata["bodySha"]):
            api.dispatch("process-atlas-submission.yml", inputs={"issue_number": str(metadata["issue"])})
            api.request("PATCH", f"pulls/{pr['number']}", {"state": "closed"})
            return {"action": "reprepare", "reason": "Main advanced concurrently with protected merge"}
        raise
    if not merged.get("merged"):
        raise RuntimeError("GitHub did not merge the exact validated PR")
    return request_deployment(api, pr, metadata)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "publish"])
    args = parser.parse_args()
    api = GitHub(os.environ.get("GITHUB_REPOSITORY", ""), os.environ.get("GH_TOKEN", ""))
    if args.action == "prepare":
        raw = os.environ.get("ATLAS_SUBMISSION_ISSUE", "")
        if not re.fullmatch(r"[1-9][0-9]*", raw):
            parser.error("ATLAS_SUBMISSION_ISSUE must be a positive issue number")
        result = prepare(api, int(raw))
    else:
        result = publish(api, json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8")))
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
