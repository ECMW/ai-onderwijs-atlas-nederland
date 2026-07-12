"""Beleefde metadata/fingerprintcontrole; wijzigt publieke records nooit."""
import json,hashlib,re,time,urllib.request,urllib.error
from datetime import datetime,timezone
from pathlib import Path
R=Path(__file__).parents[1]; sources=json.loads((R/'data/sources.json').read_text(encoding='utf-8')); old={x['sourceId']:x for x in json.loads((R/'data/source-checks.json').read_text(encoding='utf-8'))} if (R/'data/source-checks.json').exists() else {}; out=[]
for s in sources:
 if not s.get('enabled'): continue
 row={'sourceId':s['id'],'checkedAt':datetime.now(timezone.utc).isoformat(),'url':s['baseUrl']}
 try:
  req=urllib.request.Request(s['baseUrl'],headers={'User-Agent':'AI-Onderwijs-Atlas/1.0 (+https://ecmw.github.io/ai-onderwijs-atlas-nederland/)'}); resp=urllib.request.urlopen(req,timeout=15); body=resp.read(500000).decode('utf-8','ignore'); text=re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>',' ',body,flags=re.S|re.I); fp=hashlib.sha256(re.sub(r'\s+',' ',text).strip().encode()).hexdigest(); row.update(reachable=True,httpStatus=resp.status,finalUrl=resp.url,title=(re.search(r'<title[^>]*>(.*?)</title>',body,re.S|re.I).group(1).strip()[:200] if re.search(r'<title[^>]*>(.*?)</title>',body,re.S|re.I) else None),fingerprint=fp,changed=bool(old.get(s['id']) and old[s['id']].get('fingerprint')!=fp))
 except Exception as e: row.update(reachable=False,httpStatus=getattr(e,'code',None),error=type(e).__name__,changed=False)
 out.append(row);time.sleep(1)
(R/'data/source-checks.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
