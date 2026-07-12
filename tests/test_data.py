import json,re,unittest
from pathlib import Path
R=Path(__file__).parents[1]; D=json.loads((R/'data/records.json').read_text(encoding='utf-8'))
class DataTests(unittest.TestCase):
 def test_unique_ids(self): self.assertEqual(len(D),len({x['id'] for x in D}))
 def test_titles(self): self.assertTrue(all(x.get('title') for x in D))
 def test_verified_complete(self): self.assertTrue(all(x.get('lastVerified') and x.get('sourceUrls') for x in D if x['verificationStatus']=='verified'))
 def test_white_spots(self): self.assertFalse(any(x['recordType']=='white_spot' and x['status']=='available' for x in D))
 def test_public_projection_is_verified_existing_material(self):
  payload=(R/'data/data-v2.js').read_text(encoding='utf-8').removeprefix('window.ATLAS_RECORDS=').removesuffix(';\n')
  public=json.loads(payload)['records']
  self.assertTrue(public)
  self.assertTrue(all(x['recordType'] not in ('white_spot','identified_need') for x in public))
  self.assertTrue(all(x['legacyType'] not in ('Witte vlek','Behoefte') for x in public))
  self.assertTrue(all(x['verificationStatus'] in ('verified','recently_checked') for x in public))
  self.assertTrue(all(any(s.get('url') and s.get('sourceType')=='official' for s in x.get('sourceUrls',[])) for x in public))
 def test_urls(self): self.assertTrue(all(re.match(r'^https?://',s['url']) for x in D for s in x.get('sourceUrls',[])))
 def test_relations(self):
  ids={x['id'] for x in D}; self.assertTrue(all(r in ids for x in D for r in x.get('relatedIds',[])))
 def test_no_html(self): self.assertFalse(any(re.search(r'<[^>]+>',str(x.get('description') or '')) for x in D))
if __name__=='__main__': unittest.main()
