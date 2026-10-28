"""Audit matching complete articulated-impact matrices without asserting release readiness."""
import json,math,sys
from pathlib import Path
base,candidate,out=map(Path,sys.argv[1:])
if out.exists():raise ValueError('Refusing to replace evidence')
fields=('mode','offset','angle','hz','units')
def read(p):
    assert json.loads((p/'complete.json').read_text())==dict(cases=48,sourceUnchanged=True)
    rows=json.loads((p/'results.json').read_text())
    keyed={tuple(r[k] for k in fields):r for r in rows}
    assert len(rows)==len(keyed)==48
    for r in rows:
        assert all(math.isfinite(r[k]) for k in ['maxMomentumError','maxAngularError','maxEnergyGain','maxRigidVelocityError'])
    return keyed,json.loads((p/'manifest.json').read_text())
a,am=read(base);b,bm=read(candidate);assert a.keys()==b.keys()
for path,h in am['hashes'].items():
    if not path.endswith('/rapier.mjs'):assert bm['hashes'][path]==h,'Different probe source'
summary={}
for mode in ['compound','multibody']:
    summary[mode]={}
    for metric in ['maxMomentumError','maxAngularError','maxEnergyGain','maxRigidVelocityError']:
        summary[mode][metric]={name:max(r[metric] for r in rows.values() if r['mode']==mode) for name,rows in [('baseline',a),('candidate',b)]}
changes=[]
for key in a:
    assert a[key]['before']==b[key]['before'],'Different physical input'
    changes.append({**dict(zip(fields,key)),**{metric+'Delta':b[key][metric]-a[key][metric] for metric in ['maxMomentumError','maxAngularError','maxEnergyGain','maxRigidVelocityError']}})
out.write_text(json.dumps(dict(scope='bounded audit, not release acceptance',summary=summary,changes=changes),indent=2)+'\n')
print(json.dumps(summary,indent=2))
