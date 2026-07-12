import json
from pathlib import Path

R = Path(__file__).parents[1]
records = json.loads((R / 'data/records.json').read_text(encoding='utf-8'))
meta = json.loads((R / 'data/metadata.json').read_text(encoding='utf-8'))


def is_publishable(record):
    """Alleen aantoonbaar bestaand en recent gecontroleerd aanbod publiceren."""
    if record.get('recordType') in {'identified_need', 'white_spot'}:
        return False
    if record.get('legacyType') in {'Behoefte', 'Witte vlek'}:
        return False
    if record.get('verificationStatus') not in {'verified', 'recently_checked'}:
        return False
    return any(
        source.get('url') and source.get('sourceType') == 'official'
        for source in record.get('sourceUrls', [])
    )


published = [record for record in records if is_publishable(record)]
public_meta = {**meta, 'recordCount': len(published)}
(R / 'data/data-v2.js').write_text(
    'window.ATLAS_RECORDS=' + json.dumps(
        {'metadata': public_meta, 'records': published}, ensure_ascii=False, separators=(',', ':')
    ) + ';\n', encoding='utf-8'
)
(R / 'data/search-index.json').write_text(json.dumps([
    {'id': item['id'], 'text': ' '.join(str(value) for value in [
        item['title'], item.get('providerName'), item.get('description'), *item.get('keywords', [])
    ] if value)} for item in published
], ensure_ascii=False), encoding='utf-8')
