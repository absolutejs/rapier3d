"""Candidate-18 acceptance evidence, not production qualification."""
import hashlib
import json
from pathlib import Path
root=Path(__file__).resolve().parent
baseline=json.loads((root.parent/'angular-audit/support.json').read_text())
untagged=json.loads((root/'untagged.json').read_text())
tagged=json.loads((root/'tagged.json').read_text())
matched=0
for current,prior in zip(untagged['cases'],baseline['cases'],strict=True):
    for key in ['span','hz','omega','reverse']: assert current[key]==prior[key]
    for a,b in zip(current['frames'],prior['frames'],strict=True):
        for key in ['frame','position','velocity','rotation','sphereAngularVelocity','sphereRotation','separation']:
            assert a[key]==b[key],(current['hz'],current['omega'],a['frame'],key)
        matched+=1
tag_control=json.loads((root/'baseline-tagged.json').read_text())
tag_control_frames=0
for current in tag_control['cases']:
    prior=next(c for c in baseline['cases'] if all(c[k]==current[k] for k in ['span','hz','omega','reverse']))
    for a,b in zip(current['frames'],prior['frames'],strict=True):
        for key in ['position','velocity','rotation','sphereAngularVelocity','sphereRotation','separation']:
            assert a[key]==b[key],('tag-only-control',key)
        tag_control_frames+=1
rows=[]
for current in tagged['cases']:
    key={k:current[k] for k in ['span','hz','omega','reverse']}
    prior=next(c for c in baseline['cases'] if all(c[k]==v for k,v in key.items()))
    rows.append(dict(**key,baselineDepthM=max(0,-prior['peak']['separation']),candidateDepthM=max(0,-current['peak']['separation'])))
result=dict(physicalAcceptance=False,untaggedExactParityFrames=matched,tagOnlyControlFrames=tag_control_frames,
    baselineEngineSha256=baseline['engineSha256'],candidateEngineSha256=tagged['engineSha256'],
    taggedFixtureOnly=True,cases=rows,
    inputHashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [root/'untagged.json',root/'tagged.json',root/'baseline-tagged.json']})
(root/'comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print('Exact untagged parity frames:',matched)
for row in rows:
    if row['omega']>0 and not row['reverse']:print(row)
