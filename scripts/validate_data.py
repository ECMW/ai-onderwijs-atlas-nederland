import json,re,sys
from datetime import date,datetime
from pathlib import Path
from contribution_quality import commercial_field_errors
from offer_categories import offer_category_errors
from publication_scope import publication_exclusion_errors
R=Path(__file__).parents[1]; records=json.loads((R/'data/records.json').read_text(encoding='utf-8'))
T={'organization','programme','product','service','guidance','training','book','subsidy','funding_call','pilot','practice_example','community','standard','legislation','policy_document','research_project','identified_need','white_spot'}; S={'available','pilot','in_development','planned','open_call','closed_call','archived','needs_verification','identified_need','unknown'}; V={'verified','recently_checked','stale','changed','broken_source','needs_review'}
errors=[]; ids=[x.get('id') for x in records]
if len(ids)!=len(set(ids)): errors.append('IDs zijn niet uniek')
for x in records:
 errors.extend(commercial_field_errors(x))
 errors.extend(offer_category_errors(x))
 errors.extend(publication_exclusion_errors(x))
 if not x.get('title'): errors.append(f"{x.get('id')}: titel ontbreekt")
 if x.get('recordType') not in T: errors.append(f"{x['id']}: ongeldig recordType")
 if x.get('status') not in S or x.get('verificationStatus') not in V: errors.append(f"{x['id']}: ongeldige status")
 if x.get('verificationStatus')=='verified' and (not x.get('lastVerified') or not x.get('sourceUrls')): errors.append(f"{x['id']}: verified zonder datum/bron")
 if x.get('recordType')=='white_spot' and x.get('status')=='available': errors.append(f"{x['id']}: witte vlek beschikbaar")
 if x.get('recordType')=='book' and (x.get('bookCategory') not in {'reading','study','practice'} or not isinstance(x.get('authors'),list) or not all(isinstance(a,str) and a.strip() for a in x.get('authors',[])) or not re.fullmatch(r'\d{13}',str(x.get('isbn',''))) or 'nl' not in x.get('language',[])): errors.append(f"{x['id']}: boek mist geldige boeksoort, auteur(s), ISBN-13 of Nederlandse taalcode")
 for s in x.get('sourceUrls',[]):
  if not re.match(r'^https?://[^\s]+$',s.get('url','')): errors.append(f"{x['id']}: ongeldige URL")
 for rid in x.get('relatedIds',[])+x.get('parentIds',[])+x.get('childIds',[]):
  if rid not in ids: errors.append(f"{x['id']}: relatie naar onbekend ID {rid}")
print('\n'.join(errors) if errors else f'OK: {len(records)} records');sys.exit(bool(errors))
