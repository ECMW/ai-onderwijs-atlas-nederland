"""The edition date advances on generation without rewriting source verification."""
import json
from datetime import date
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from generate_data import generate


class GenerationDateTests(unittest.TestCase):
    def test_old_footer_date_advances_but_record_verification_remains_intact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'data').mkdir()
            record = {
                'id': 'official-guidance', 'title': 'AI in het onderwijs',
                'recordType': 'guidance', 'verificationStatus': 'verified',
                'lastVerified': '2026-08-31',
                'sourceUrls': [{'url': 'https://example.org/guide', 'sourceType': 'official'}],
            }
            canonical = json.dumps([record])
            (root / 'data/records.json').write_text(canonical, encoding='utf-8')
            (root / 'data/metadata.json').write_text(
                json.dumps({'updated': '5 september 2026', 'recordCount': 1}), encoding='utf-8'
            )
            (root / 'index.html').write_text('<script src="data/data-v2.js"></script>', encoding='utf-8')

            generate(root, generated_on=date(2026, 9, 9))

            metadata = json.loads((root / 'data/metadata.json').read_text(encoding='utf-8'))
            script = (root / 'data/data-v2.js').read_text(encoding='utf-8')
            public = json.loads(script.removeprefix('window.ATLAS_RECORDS=').removesuffix(';\n'))
            self.assertEqual(metadata['updated'], '9 september 2026')
            self.assertEqual(public['metadata']['updated'], '9 september 2026')
            self.assertEqual(public['records'][0]['lastVerified'], '2026-08-31')
            self.assertEqual((root / 'data/records.json').read_text(encoding='utf-8'), canonical)
