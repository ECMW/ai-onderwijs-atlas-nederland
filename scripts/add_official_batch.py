import json,re,unicodedata
from pathlib import Path
R=Path(__file__).parents[1]; items=json.loads((R/'data/items.json').read_text(encoding='utf-8')); new=json.loads((R/'imports/official-batch-2026-07-12.json').read_text(encoding='utf-8')); urls={x.get('url') for x in items};titles={x['title'].casefold() for x in items}
slug=lambda s:re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()))
added=0
for x in new:
 if x['url'] in urls or x['title'].casefold() in titles: continue
 x.update(id=slug(x['title']),availableFrom=str(x['year']),duration=None,budget=None,links=[{'label':'Officiële bron','url':x['url']}],sourceSection=x['type']+'en',added='2026-07-12',related=[]);items.append(x);added+=1
(R/'data/items.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(added)
meta=json.loads((R/'data/metadata.json').read_text(encoding='utf-8'));meta.update(updated='12 juli 2026',recordCount=len(items));(R/'data/metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');payload={'metadata':meta,'items':items,'needs':['Veilige AI-omgeving','AI-literacy','Toetsing','Privacy','AI Act','Subsidies','Voorbeeldbeleid','Implementatiehulp','Standaarden','Pilots','Communities'],'changelog':[]};(R/'data/data.js').write_text('window.ATLAS_DATA='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
