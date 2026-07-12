import json
from pathlib import Path
R=Path(__file__).parents[1]; records=json.loads((R/'data/records.json').read_text(encoding='utf-8')); meta=json.loads((R/'data/metadata.json').read_text(encoding='utf-8'))
(R/'data/data-v2.js').write_text('window.ATLAS_RECORDS='+json.dumps({'metadata':meta,'records':records},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(R/'data/search-index.json').write_text(json.dumps([{'id':x['id'],'text':' '.join(str(v) for v in [x['title'],x.get('providerName'),x.get('description'),*x.get('keywords',[]) ] if v)} for x in records],ensure_ascii=False),encoding='utf-8')
