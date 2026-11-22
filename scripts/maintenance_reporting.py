"""Decision-oriented daily report derived only from events and validated proposals."""
import json
import re
from datetime import datetime, timezone


def is_time_sensitive(item: dict) -> bool:
    if item["materiality"] != "high":
        return False
    evidence = item.get("evidence", {})
    if evidence.get("requiresRepeatedSuccessfulAbsence"):
        return False
    if "before" in evidence and "after" in evidence and not item.get("targetRecordId"):
        facts = evidence["before"] + evidence["after"]
        detection_year = item["detectedAt"][:4]
        # Only downgrade when every observed date is explicitly historical and closed.
        def historical_closed(fact):
            year = re.search(r"\b(\d{4})\b", fact["dateText"])
            return (year is not None and year.group(1) < detection_year
                    and "status gesloten" in fact.get("context", "").casefold())
        if facts and all(historical_closed(fact) for fact in facts):
            return False
    return True


def build_daily_report(events: list[dict], proposals: list[dict]) -> dict:
    kinds = ("NEW", "CHANGED", "REMOVED", "UNREACHABLE", "SOURCE_CHANGED", "NO_CHANGE")
    counts = {kind: sum(event["type"] == kind for event in events) for kind in kinds}
    failed = [event for event in events if event["type"] in {"UNREACHABLE", "REMOVED"}]
    verification = [item for item in proposals if item["action"] == "investigate" or item["uncertainties"]]
    insufficient = [item for item in proposals if not item["primarySources"]]
    urgent = [item for item in proposals if is_time_sensitive(item)]
    priority_checks = [item for item in verification if item["materiality"] == "high" and not is_time_sensitive(item)]
    links = [{"proposalId": item["proposalId"], "title": item["title"],
              "jsonPath": f"proposals/{item['proposalId']}.json",
              "markdownPath": f"proposals/{item['proposalId']}.md"} for item in proposals]
    return {
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "summary": {
            "sourcesChecked": len(events),
            "successfulChecks": len(events) - len(failed),
            "failedChecks": len(failed),
            "events": counts,
            "proposalsForReview": len(proposals),
            "readyForDecision": len(proposals) - len(verification),
            "needsExtraVerification": len(verification),
            "insufficientEvidence": len(insufficient),
            "unreachableOrStructurallyFailing": len(failed) + counts["SOURCE_CHANGED"],
            "timeSensitiveChanges": len(urgent),
            "actionRequired": bool(proposals),
        },
        "timeSensitive": urgent,
        "priorityVerification": priority_checks,
        "failedSources": failed,
        "proposalLinks": links,
        "proposals": proposals,
    }


def daily_report_markdown(report: dict) -> str:
    s = report["summary"]
    lines = ["# Dagelijkse Atlas-controle", "",
             f"- Bronnen gecontroleerd: **{s['sourcesChecked']}**",
             f"- Succesvol: **{s['successfulChecks']}**; mislukt: **{s['failedChecks']}**",
             f"- Gereed voor beslissing: **{s['readyForDecision']}**",
             f"- Extra verificatie nodig: **{s['needsExtraVerification']}**",
             f"- Onvoldoende bewijs: **{s['insufficientEvidence']}**",
             f"- Onbereikbaar of structureel afwijkend: **{s['unreachableOrStructurallyFailing']}**",
             f"- Tijdgevoelige wijzigingen: **{s['timeSensitiveChanges']}**"]
    if not s["actionRequired"]:
        lines += ["", "## Geen actie nodig", "",
                  "Er zijn geen betekenisvolle wijzigingen die menselijke beoordeling vragen."]
        return "\n".join(lines) + "\n"
    if report["timeSensitive"]:
        lines += ["", "## Eerst beoordelen: tijdgevoelig", ""]
        for item in report["timeSensitive"]:
            lines.append(f"- [{item['title']}](proposals/{item['proposalId']}.md)")
    if report.get("priorityVerification"):
        lines += ["", "## Broncontrole met hoge mogelijke impact", ""]
        for item in report["priorityVerification"]:
            target = item.get("targetRecordId") or item["source"]["sourceName"]
            lines.append(f"- `{target}` · {item['uncertainties'][-1]} Voorstel `{item['proposalId']}`.")
    lines += ["", "## Voorstellen", ""]
    for item in report["proposals"]:
        uncertainties = "; ".join(item["uncertainties"]) or "geen vastgelegd"
        lines += [f"### {item['title']}",
                  f"- Actie: `{item['action']}`; materialiteit: {item['materiality']}",
                  f"- Bron: {item['source']['sourceName']} ({item['source']['sourceUrl']})",
                  f"- Zekerheid: {item['confidence']}; doublurerisico: {item['duplicateRisk']}",
                  f"- Onzekerheden: {uncertainties}",
                  f"- [Leesbaar voorstel](proposals/{item['proposalId']}.md)",
                  f"- [Machineleesbaar voorstel](proposals/{item['proposalId']}.json)", ""]
    if report["failedSources"]:
        lines += ["## Falende bronnen", ""]
        for event in report["failedSources"]:
            lines.append(f"- `{event['sourceId']}`: {event['type']} ({event.get('reason', 'onbekend')})")
        lines.append("")
    lines += ["Niets is automatisch gepubliceerd, gewijzigd, gearchiveerd of verwijderd.", ""]
    return "\n".join(lines)


def proposal_markdown(item: dict) -> str:
    source = item["source"]
    uncertainties = item.get("uncertainties") or ["geen vastgelegd"]
    duplicates = item.get("possibleDuplicates") or []
    relations = item.get("possibleRelations") or []
    lines = [f"# {item['title']}", "",
             f"- Voorstel-ID: `{item['proposalId']}`",
             f"- Gedetecteerd en gecontroleerd: {item['checkedAt']}",
             f"- Actie: `{item['action']}`",
             f"- Doelrecord: `{item.get('targetRecordId') or 'niet vastgesteld'}`",
             f"- Bron: {source['sourceName']} ({source['sourceUrl']})",
             f"- Bronrol: {source['sourceRole']}; vertrouwen: {source['trustLevel']}",
             f"- Zekerheid: {item['confidence']}; materialiteit: {item['materiality']}",
             f"- Doublurerisico: {item['duplicateRisk']}",
             f"- Aanbevolen beslissing: {item['recommendedDecision']}", "",
             "## Reden", "", item["reason"], "", "## Bewijs", "", "```json",
             json.dumps(item.get("evidence"), ensure_ascii=False, indent=2), "```", "",
             "## Oude waarden", "", "```json", json.dumps(item.get("oldValues"), ensure_ascii=False, indent=2), "```", "",
             "## Voorgestelde waarden", "", "```json", json.dumps(item.get("proposedValues"), ensure_ascii=False, indent=2), "```", "",
             "## Onzekerheden", ""]
    lines += [f"- {value}" for value in uncertainties]
    lines += ["", "## Mogelijke doublures", ""]
    lines += ([f"- `{value.get('id')}` - {value.get('title')} ({value.get('reason')})" for value in duplicates]
              or ["- Geen kandidaat gevonden."])
    lines += ["", "## Mogelijke relaties", ""]
    lines += ([f"- `{value.get('relationType')}` -> `{value.get('targetId')}`" for value in relations]
              or ["- Geen relatie voorgesteld."])
    lines += ["", "## Uitgevoerde controles", ""]
    lines += [f"- {value}" for value in item.get("checksPerformed", [])]
    lines += ["", "Menselijke beoordeling is vereist. Dit voorstel kan niet automatisch worden gepubliceerd, gewijzigd, gearchiveerd of verwijderd.", ""]
    return "\n".join(lines)
