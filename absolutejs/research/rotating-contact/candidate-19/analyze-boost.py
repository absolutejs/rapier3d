import json,math,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent
paths=[root/(n+'.json') for n in ['boosted','tagged','baseline-boosted']]
a,b,baseline=[json.loads(p.read_text()) for p in paths]
assert a['commonBoost'] and baseline['commonBoost'] and not b.get('commonBoost',False)
rows=[]
for c,old,prior in zip(a['cases'],b['cases'],baseline['cases'],strict=True):
 pe=ve=0
 for f,g in zip(c['frames'],old['frames'],strict=True):
  pe=max(pe,math.dist([f['position'][k]-f['supportPosition'][k] for k in ['x','y','z']],[g['position'][k] for k in ['x','y','z']]))
  ve=max(ve,math.dist([f['velocity'][k]-v for k,v in zip(['x','y','z'],[3,-2,1])],[g['velocity'][k] for k in ['x','y','z']]))
 rows.append({**{k:c[k] for k in ['span','hz','omega','reverse']},'maxRelativePositionDifferenceM':pe,'maxRelativeVelocityDifferenceMPerS':ve,'peakDepthDifferenceM':abs(c['peak']['separation']-old['peak']['separation']),'maxTranslationPathErrorM':c['maxTranslationPathError'],'candidateDepthM':max(0,-c['peak']['separation']),'boostedBaselineDepthM':max(0,-prior['peak']['separation'])})
(root/'boost-summary.json').write_text(json.dumps(dict(physicalAcceptance=False,inputHashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},cases=rows),indent=2)+'\n')
print('Maximum relative position difference:',max(r['maxRelativePositionDifferenceM'] for r in rows))
