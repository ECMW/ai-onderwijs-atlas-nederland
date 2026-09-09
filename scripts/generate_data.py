import json
from datetime import date
from pathlib import Path
from public_assets import versioned_html
from promote_contribution import dutch_date

R = Path(__file__).parents[1]


def is_publishable(record):
    """Alleen aantoonbaar bestaand en recent gecontroleerd aanbod publiceren."""
    if 'publicationExclusion' in record:
        return False
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


def generate(root: Path = R, generated_on: date | None = None) -> None:
    records = json.loads((root / 'data/records.json').read_text(encoding='utf-8'))
    meta = json.loads((root / 'data/metadata.json').read_text(encoding='utf-8'))
    published = [record for record in records if is_publishable(record)]
    # This is the date of an actual generated edition, not a claim that every
    # individual source was checked today. Record verification dates stay intact.
    public_meta = {**meta, 'updated': dutch_date(generated_on or date.today()), 'recordCount': len(published)}
    (root / 'data/metadata.json').write_text(
        json.dumps(public_meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )
    (root / 'data/data-v2.js').write_text(
        'window.ATLAS_RECORDS=' + json.dumps(
            {'metadata': public_meta, 'records': published}, ensure_ascii=False, separators=(',', ':')
        ) + ';\n', encoding='utf-8'
    )
    (root / 'data/search-index.json').write_text(json.dumps([
        {'id': item['id'], 'text': ' '.join(str(value) for value in [
            item['title'], item.get('providerName'), item.get('description'), *item.get('keywords', [])
        ] if value)} for item in published
    ], ensure_ascii=False), encoding='utf-8')

    # Changing data or frontend code must also change the browser cache key.
    index = root / 'index.html'
    index.write_text(versioned_html(root, index.read_text(encoding='utf-8')), encoding='utf-8')


if __name__ == '__main__':
    generate()
