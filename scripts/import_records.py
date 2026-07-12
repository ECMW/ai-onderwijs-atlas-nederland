"""Veilige beheerde JSON/CSV-import; publiceert niet automatisch."""
import csv,json,re,unicodedata
from pathlib import Path
R=Path(__file__).parents[1]; base=json.loads((R/'data/records.json').read_text(encoding='utf-8')); incoming=[]
if (R/'imports/new-records.json').exists(): incoming+=json.loads((R/'imports/new-records.json').read_text(encoding='utf-8'))
if (R/'imports/new-records.csv').exists(): incoming+=list(csv.DictReader((R/'imports/new-records.csv').open(encoding='utf-8-sig')))
norm=lambda s:re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower()).strip('-'); titles={norm(x['title']) for x in base};urls={s['url'] for x in base for s in x.get('sourceUrls',[])};accepted=[];dupes=[];rejected=[]
for x in incoming:
 if not x.get('title') or not x.get('recordType') or not x.get('sourceUrl'): rejected.append({'title':x.get('title'),'reason':'titel, recordType of sourceUrl ontbreekt'});continue
 if norm(x['title']) in titles or x['sourceUrl'] in urls: dupes.append({'title':x['title'],'reason':'mogelijke titel- of URL-match'});continue
 x.update(id=x.get('id') or f"{x['recordType']}-{norm(x['title'])}",verificationStatus='needs_review',status=x.get('status') or 'needs_verification',lastVerified=None,sourceUrls=[{'label':'Aangeleverde bron','url':x.pop('sourceUrl'),'sourceType':'official'}]);accepted.append(x)
(R/'reports').mkdir(exist_ok=True);(R/'reports/potential-duplicates.json').write_text(json.dumps(dupes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(R/'reports/import-report.md').write_text(f'# Import report\n\n- Geaccepteerd voor review: {len(accepted)}\n- Mogelijke duplicaten: {len(dupes)}\n- Afgewezen: {len(rejected)}\n\nEr is niets automatisch gepubliceerd.\n',encoding='utf-8');print(json.dumps({'accepted':accepted,'rejected':rejected},ensure_ascii=False,indent=2))
