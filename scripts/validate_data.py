import json,re,sys
from datetime import date,datetime
from pathlib import Path
R=Path(__file__).parents[1]; records=json.loads((R/'data/records.json').read_text(encoding='utf-8'))
T={'organization','programme','product','service','guidance','training','subsidy','funding_call','pilot','practice_example','community','standard','legislation','policy_document','research_project','identified_need','white_spot'}; S={'available','pilot','in_development','planned','open_call','closed_call','archived','needs_verification','identified_need','unknown'}; V={'verified','recently_checked','stale','changed','broken_source','needs_review'}
errors=[]; ids=[x.get('id') for x in records]
if len(ids)!=len(set(ids)): errors.append('IDs zijn niet uniek')
for x in records:
 if not x.get('title'): errors.append(f"{x.get('id')}: titel ontbreekt")
 if x.get('recordType') not in T: errors.append(f"{x['id']}: ongeldig recordType")
 if x.get('status') not in S or x.get('verificationStatus') not in V: errors.append(f"{x['id']}: ongeldige status")
 if x.get('verificationStatus')=='verified' and (not x.get('lastVerified') or not x.get('sourceUrls')): errors.append(f"{x['id']}: verified zonder datum/bron")
 if x.get('recordType')=='white_spot' and x.get('status')=='available': errors.append(f"{x['id']}: witte vlek beschikbaar")
 for s in x.get('sourceUrls',[]):
  if not re.match(r'^https?://[^\s]+$',s.get('url','')): errors.append(f"{x['id']}: ongeldige URL")
 for rid in x.get('relatedIds',[])+x.get('parentIds',[])+x.get('childIds',[]):
  if rid not in ids: errors.append(f"{x['id']}: relatie naar onbekend ID {rid}")
print('\n'.join(errors) if errors else f'OK: {len(records)} records');sys.exit(bool(errors))
