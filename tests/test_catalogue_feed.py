import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from catalogue_feed import CATALOGUE_URL, write_catalogue_feed


class CatalogueFeedTests(unittest.TestCase):
    def test_export_preserves_citation_and_excludes_editorial_data(self):
        url = 'https://www.uu.nl/onderwijs#beoordeling'
        example = {
            'id': 'voorbeeld', 'title': 'Wie toetst wie?', 'description': 'Voorbeeld uit België.',
            'notes': 'Interne notitie', 'changeHistory': ['interne historie'],
            'lastVerified': '2026-11-20', 'sectors': ['HBO'],
            'sourceUrls': [
                {'sourceType': kind, 'url': address}
                for kind, address in [('official', url), ('official', url), ('secondary', 'https://www.slo.nl/'),
                                      ('official', 'javascript:alert(1)'), ('official', 'https://user@www.uu.nl/'),
                                      ('official', 'http://www.uu.nl:80/archief'), ('official', 'http://localhost/')]
            ],
        }
        funding = dict(example, id='call', title='Financiering', legacyType='Call', purpose='Onderwijs onderzoeken.',
                       description='Open financieringsronde', providerName='Voorbeeldaanbieder')
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'index.json'
            write_catalogue_feed(path, [example, funding])
            result = json.loads(path.read_text(encoding='utf-8'))
        self.assertEqual(result['schemaVersion'], 1)
        call, item = result['records']
        self.assertEqual(call['description'], funding['purpose'])
        self.assertEqual(item['atlasUrl'], CATALOGUE_URL + 'voorbeeld/')
        self.assertEqual(item['officialSources'], [url, 'http://www.uu.nl:80/archief'])
        self.assertEqual(item['description'], example['description'])
        self.assertEqual(item['lastVerified'], example['lastVerified'])
        self.assertEqual(item['subjects'], [])
        self.assertEqual(set(item), {'id', 'title', 'atlasUrl', 'providerName', 'description', 'sectors',
                                    'subjects', 'audiences', 'lastVerified', 'officialSources'})
