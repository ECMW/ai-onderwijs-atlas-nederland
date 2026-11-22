"""Summarize the research run and preserve pending discovery URLs in its artifact."""
import json
import os
from pathlib import Path


def research_summary(report, discovery, intake):
    checks = report["summary"]
    research = discovery["summary"]
    if report.get("reportType") != "source_research" or discovery.get("version") != 1:
        raise ValueError("Unknown research report format")
    counts = [checks["sourcesChecked"], checks["successfulChecks"], checks["failedChecks"],
              research["visits"], research["approved"], research["deferred"]]
    if any(type(value) is not int or value < 0 for value in counts):
        raise ValueError("Invalid research counts")
    if checks["successfulChecks"] + checks["failedChecks"] != checks["sourcesChecked"]:
        raise ValueError("Incomplete source check totals")
    if not isinstance(report["proposals"], list) or len(report["proposals"]) != checks["researchQueueSize"]:
        raise ValueError("Incomplete research queue")
    if not isinstance(intake, list) or len(intake) != research["approved"]:
        raise ValueError("Incomplete discovery intake")
    admitted = sum(item["action"] == "independent_admission_requested" for item in intake)
    return (f"| Gecontroleerde bronnen | {checks['sourcesChecked']} |\n"
            f"| Mislukte broncontroles | {checks['failedChecks']} |\n"
            f"| Onderzoekssignalen in het rapport | {checks['researchQueueSize']} |\n"
            f"| Bezochte detailpagina’s | {research['visits']} |\n"
            f"| Doorgezet naar onafhankelijke intake | {admitted} |\n"
            f"| Nog te bezoeken kandidaten | {research['deferred']} |")


def discovery_queue(state):
    pending = {"blocked", "unavailable", "broker_review"}
    return [{"url": item["url"], "status": item["status"]} for item in state["urls"].values()
            if item["status"] in pending]


if __name__ == "__main__":
    def read(path):
        return json.loads(Path(path).read_text(encoding="utf-8"))

    summary = research_summary(read("maintenance-output/daily-report.json"),
                               read("discovery-output/review.json"), read("discovery-output/intake-result.json"))
    queue = discovery_queue(read("discovery-state/state.json"))
    Path("discovery-output/research-queue.json").write_text(
        json.dumps(queue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as output:
        print(f"## Bronnenonderzoek\n\n| Onderdeel | Aantal |\n| --- | ---: |\n{summary}\n"
              f"| Bronlinks bewaard voor verder onderzoek | {len(queue)} |", file=output)
