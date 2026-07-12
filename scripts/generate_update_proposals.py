import json
from datetime import datetime,timezone
from pathlib import Path
R=Path(__file__).parents[1]; checks=json.loads((R/'data/source-checks.json').read_text(encoding='utf-8')); P=R/'data/proposals';P.mkdir(exist_ok=True);n=0
for c in checks:
 if not c.get('changed') and c.get('reachable'): continue
 pid=datetime.now(timezone.utc).strftime('%Y%m%d')+'-'+c['sourceId']; p={'proposalId':pid,'sourceId':c['sourceId'],'detectedAt':c['checkedAt'],'proposalType':'source_changed' if c.get('changed') else 'source_unreachable','recordId':None,'currentValue':{},'proposedValue':{},'evidence':[{'url':c['url'],'httpStatus':c.get('httpStatus'),'fingerprint':c.get('fingerprint')}],'confidence':'low','reviewStatus':'pending','automaticPublicationAllowed':False};(P/f'{pid}.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');n+=1
print(n)
