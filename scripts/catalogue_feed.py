"""Write a machine-readable summary of the public Atlas catalogue."""
import json
from pathlib import Path
from urllib.parse import quote, urlsplit

from contribution_quality import _host_is_public


CATALOGUE_URL = 'https://aionderwijsatlas.nl/aanbod/'
FUNDING_TYPES = {'Subsidie', 'Call'}


def record_description(record):
    if record.get('legacyType') in FUNDING_TYPES:
        # The original summary can describe a call as open on its review date.
        return record.get('purpose') or f'{record["legacyType"]} van {record["providerName"]}.'
    return record['description']


def official_sources(record):
    sources = {}
    for source in record.get('sourceUrls', []):
        url = source.get('url')
        if source.get('sourceType') != 'official' or not isinstance(url, str) or any(c.isspace() for c in url):
            continue
        try:
            address = urlsplit(url)
            default_port = {'https': 443, 'http': 80}.get(address.scheme)
            public = (default_port and address.port in (None, default_port)
                      and address.username is None and _host_is_public(address.hostname or ''))
        except ValueError:
            continue
        if public:
            sources.setdefault(url, source)
    return list(sources.values())


def write_catalogue_feed(path: Path, records):
    """Use the same published records as the directory, with explicit public fields."""
    entries = []
    for record in sorted(records, key=lambda item: item['id']):
        entries.append({
            'id': record['id'],
            'title': record['title'],
            'atlasUrl': CATALOGUE_URL + quote(record['id'], safe='') + '/',
            'providerName': record.get('providerName'),
            'description': record_description(record),
            'sectors': record.get('sectors', []),
            'subjects': record.get('subjects', []),
            'audiences': record.get('audiences', []),
            'lastVerified': record.get('lastVerified'),
            'officialSources': [source['url'] for source in official_sources(record)],
        })
    feed = {'schemaVersion': 1, 'catalogueUrl': CATALOGUE_URL, 'records': entries}
    path.write_text(json.dumps(feed, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
