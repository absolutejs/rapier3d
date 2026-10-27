import hashlib,json,math
from pathlib import Path
root=Path(__file__).resolve().parent
rows=[];sources={}
for name,old in [('tagged','baseline-tagged'),('edge','baseline-edge'),('corner','baseline-corner'),('oblique-corner','baseline-oblique-corner')]:
 paths=[root/(n+'.json') for n in [name,old]]
 a,b=[json.loads(p.read_text()) for p in paths]
 sources.update({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in paths})
  assert a['boxOracle'] is True
 assert a.get('noCcd',False) is False
 assert a['solverSubdivisionsPerOuterInterval']==32
 for c,p in zip(a['cases'],b['cases'],strict=True):
  key={k:c[k] for k in ['span','hz','omega','reverse']};assert key=={k:p[k] for k in key}
  new_depth=max(0,-c['peak']['separation']);old_depth=max(0,-p['peak']['separation'])
  rows.append(dict(fixture=name,**key,baselineDepthM=old_depth,candidateDepthM=new_depth,
   deltaDepthM=new_depth-old_depth,maxSpeedMPerS=max(math.hypot(*f['velocity'].values()) for f in c['frames']),
   maxSpinRadS=max(math.hypot(*f['sphereAngularVelocity'].values()) for f in c['frames'])))
result=dict(physicalAcceptance=False,caseCount=len(rows),inputHashes=sources,
 maxSpeedMPerS=max(r['maxSpeedMPerS'] for r in rows),maxSpinRadS=max(r['maxSpinRadS'] for r in rows),
 regressionsAbove1Micrometer=[r for r in rows if r['deltaDepthM']>1e-6],cases=rows)
assert result['maxSpeedMPerS']<390,'Result approaches the source default 400m/s speed cap'
(root/'matrix-summary.json').write_text(json.dumps(result,indent=2)+'\n')
print('Cases:',len(rows),'max speed:',result['maxSpeedMPerS'],'max spin:',result['maxSpinRadS'])
print('Regressions >1um:',len(result['regressionsAbove1Micrometer']))
for r in result['regressionsAbove1Micrometer']:print(r)
for name in ['tagged','edge','corner','oblique-corner']:
 group=[r for r in rows if r['fixture']==name];print(name,'worst depth mm',max(r['candidateDepthM'] for r in group)*1000)
