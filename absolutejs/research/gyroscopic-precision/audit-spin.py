"""Verify complete comparable free-spin evidence, including regressions."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent
old=json.loads((root/'baseline.json').read_text());new=json.loads((root/'candidate.json').read_text())
for key,path in [('sourceSha256',root/'free-spin-probe.ts'),('referenceSourceSha256',root/'free-spin-math.ts')]:
    assert old[key]==new[key]==hashlib.sha256(path.read_bytes()).hexdigest()
assert len(old['rows'])==len(new['rows'])==336
assert old['referenceControls']==new['referenceControls']
assert new['engineSha256']==hashlib.sha256((root.parents[2]/'dist/rapier.mjs').read_bytes()).hexdigest()
rows=[]
for a,b in zip(old['rows'],new['rows']):
    keys=['shape','hz','tilted','spin','budget','stepsCompleted']
    assert all(a[k]==b[k] for k in keys)
    assert b['stepsCompleted']==b['hz']//10 and not a['speedCapConfounded'] and not b['speedCapConfounded']
    rows.append({**{k:b[k] for k in keys},'beforeEnergyError':a['energyPeak']['relativeEnergyError'],'afterEnergyError':b['energyPeak']['relativeEnergyError'],'angularErrorDelta':b['angularPeak']['angularVelocityError']-a['angularPeak']['angularVelocityError']})
result={'cases':len(rows),'beforeMaxRelativeEnergyError':max(r['beforeEnergyError'] for r in rows),'afterMaxRelativeEnergyError':max(r['afterEnergyError'] for r in rows),'energyRegressionsOverOnePpm':[r for r in rows if r['afterEnergyError']-r['beforeEnergyError']>1e-6],'angularRegressionsOver0_0001RadPerSecond':[r for r in rows if r['angularErrorDelta']>1e-4],'scope':'No contacts or CCD; does not establish general contact accuracy. f32 conditioning and time-discretization error remain.'}
assert result['afterMaxRelativeEnergyError']<result['beforeMaxRelativeEnergyError']
assert not result['angularRegressionsOver0_0001RadPerSecond']
(root/'spin-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
