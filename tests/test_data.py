import json,re,unittest
from pathlib import Path
import sys
R=Path(__file__).parents[1]; D=json.loads((R/'data/records.json').read_text(encoding='utf-8'))
sys.path.insert(0,str(R/'scripts'))
from validate_data import isbn13_is_valid
class DataTests(unittest.TestCase):
 def test_unique_ids(self): self.assertEqual(len(D),len({x['id'] for x in D}))
 def test_titles(self): self.assertTrue(all(x.get('title') for x in D))
 def test_verified_complete(self): self.assertTrue(all(x.get('lastVerified') and x.get('sourceUrls') for x in D if x['verificationStatus']=='verified'))
 def test_white_spots(self): self.assertFalse(any(x['recordType']=='white_spot' and x['status']=='available' for x in D))
 def test_public_projection_is_verified_existing_material(self):
  payload=(R/'data/data-v2.js').read_text(encoding='utf-8').removeprefix('window.ATLAS_RECORDS=').removesuffix(';\n')
  projection=json.loads(payload); public=projection['records']
  self.assertTrue(public)
  self.assertTrue(all(x['recordType'] not in ('white_spot','identified_need') for x in public))
  self.assertTrue(all(x['legacyType'] not in ('Witte vlek','Behoefte') for x in public))
  self.assertTrue(all(x['verificationStatus'] in ('verified','recently_checked') for x in public))
  self.assertTrue(all(any(s.get('url') and s.get('sourceType')=='official' for s in x.get('sourceUrls',[])) for x in public))
  eligible=[x for x in D if 'publicationExclusion' not in x and x['recordType'] not in ('white_spot','identified_need') and x['legacyType'] not in ('Witte vlek','Behoefte') and x['verificationStatus'] in ('verified','recently_checked') and any(s.get('url') and s.get('sourceType')=='official' for s in x.get('sourceUrls',[]))]
  self.assertEqual({x['id'] for x in public},{x['id'] for x in eligible})
  self.assertEqual(projection['metadata']['recordCount'],len(public))
  self.assertEqual(json.loads((R/'data/metadata.json').read_text(encoding='utf-8'))['recordCount'],len(public))
 def test_public_data_script_is_cache_busted(self):
  html=(R/'index.html').read_text(encoding='utf-8')
  self.assertRegex(html,r'<script src="data/data-v2\.js\?v=[^"]+"></script>')
 def test_urls(self): self.assertTrue(all(re.match(r'^https?://',s['url']) for x in D for s in x.get('sourceUrls',[])))
 def test_relations(self):
  ids={x['id'] for x in D}; self.assertTrue(all(r in ids for x in D for r in x.get('relatedIds',[])))
 def test_no_html(self): self.assertFalse(any(re.search(r'<[^>]+>',str(x.get('description') or '')) for x in D))
 def test_book_isbns_are_valid_and_unique(self):
  books=[x for x in D if x.get('recordType')=='book']; isbns=[x.get('isbn') for x in books]
  self.assertTrue(all(x.get('legacyType')=='Boek' for x in books))
  self.assertTrue(all(isbn13_is_valid(value) for value in isbns)); self.assertEqual(len(isbns),len(set(isbns)))
 def test_book_required_lists_are_nonempty_and_typed(self):
  books=[x for x in D if x.get('recordType')=='book']
  self.assertTrue(all(isinstance(x.get('authors'),list) and x['authors'] for x in books))
  self.assertTrue(all(isinstance(x.get('language'),list) and 'nl' in x['language'] for x in books))
 def test_isbn13_rejects_bad_checksum_prefix_and_type(self):
  self.assertTrue(isbn13_is_valid('9789490574901'))
  self.assertFalse(isbn13_is_valid('9789490574902'))
  self.assertFalse(isbn13_is_valid('9779490574901'))
  self.assertFalse(isbn13_is_valid(9789490574901))
if __name__=='__main__': unittest.main()
