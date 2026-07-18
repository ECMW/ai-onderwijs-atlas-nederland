"""Decision-oriented daily report derived only from events and validated proposals."""
import json
from datetime import datetime, timezone


def build_daily_report(events: list[dict], proposals: list[dict]) -> dict:
    kinds = ("NEW", "CHANGED", "REMOVED", "UNREACHABLE", "SOURCE_CHANGED", "NO_CHANGE")
    counts = {kind: sum(event["type"] == kind for event in events) for kind in kinds}
    failed = [event for event in events if event["type"] in {"UNREACHABLE", "REMOVED"}]
    verification = [item for item in proposals if item["action"] == "investigate" or item["uncertainties"]]
    insufficient = [item for item in proposals if not item["primarySources"]]
    urgent = [item for item in proposals if item["materiality"] == "high"]
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
