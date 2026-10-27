"""Compare angular observations with their original, uninstrumented trajectories."""
import hashlib
import json
import math
from pathlib import Path

root=Path(__file__).resolve().parent
base=root.parent
rows=[];matched=0
for name,previous in [('support',base/'candidate-16-refresh-1.json'),('candidate-17',base/'candidate-17/support.json')]:
    path=root/(name+'.json')
    new=json.loads(path.read_text()); old=json.loads(previous.read_text())
    cases=[]
    for case, prior in zip(new['cases'],old['cases'],strict=True):
        key={k:case[k] for k in ['span','hz','omega','reverse']}
        assert key=={k:prior[k] for k in key}
        for frame, pf in zip(case['frames'],prior['frames'],strict=True):
            for k in ['frame','position','velocity','rotation','separation']:
                assert frame[k]==pf[k],(name,key,frame['frame'],k)
            matched+=1
        peak=max(case['frames'],key=lambda f:math.hypot(*f['sphereAngularVelocity'].values()))
        cases.append(dict(**key,maxSpinRadS=math.hypot(*peak['sphereAngularVelocity'].values()),
                          peakSpinFrame=peak['frame'],peakDepthM=max(0,-case['peak']['separation'])))
    rows.append(dict(name=name,inputSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                     baselineSha256=hashlib.sha256(previous.read_bytes()).hexdigest(),
                     engineSha256=new['engineSha256'],maxSpinRadS=max(c['maxSpinRadS'] for c in cases),cases=cases))
refresh=json.loads((root/'refresh-32.json').read_text())
comparison=[]
for c in refresh['cases']:
    key={k:c[k] for k in ['span','hz','omega','reverse']}
    prior=next(x for x in rows[0]['cases'] if all(x[k]==v for k,v in key.items()))
    comparison.append(dict(**key,baselineDepthM=prior['peakDepthM'],refresh32DepthM=max(0,-c['peak']['separation'])))
result=dict(physicalAcceptance=False,matchedTrajectoryFrames=matched,angularObservations=rows,
    contactRefresh32=dict(engineSha256=refresh['engineSha256'],inputSha256=hashlib.sha256((root/'refresh-32.json').read_bytes()).hexdigest(),
        elapsedMs=refresh['elapsedMs'],scope='32 total solver substeps but 32 world steps per recorded interval; changes narrow-phase, CCD and warm-start scheduling. CPU timing is a single bounded run, not a benchmark.',cases=comparison))
(root/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
print('Exact trajectory parity:',matched,'frames')
print('Maximum sphere spin rad/s:',[(r['name'],r['maxSpinRadS']) for r in rows])
for c in comparison:
    if c['span']==20 and not c['reverse'] and c['omega']>0: print(c)
