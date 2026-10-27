"""Offline feature classification of the saved sphere/box oracle trajectories.
No solver execution, no inferred internal contact feature or acceptance claim.
"""
import hashlib
import json
import math
import sys
from pathlib import Path


def classify(position, rotation, span):
    x, y, z = (position[k] for k in ('x', 'y', 'z'))
    qx, qy, qz, qw = (rotation[k] for k in ('x', 'y', 'z', 'w'))
    tx, ty, tz = 2*(-qy*z+qz*y), 2*(-qz*x+qx*z), 2*(-qx*y+qy*x)
    local = [x+qw*tx-qy*tz+qz*ty, y+qw*ty-qz*tx+qx*tz, z+qw*tz-qx*ty+qy*tx]
    d = [abs(v)-h for v, h in zip(local, [span, .05, .5])]
    outside = sum(v > 0 for v in d)
    feature = ['interior', 'face', 'edge', 'corner'][outside]
    axis = max(range(3), key=lambda i: d[i]) if outside <= 1 else None
    if feature == 'face':
        feature = ['end-face', 'broad-face', 'side-face'][axis]
    separation = math.hypot(*(max(v, 0) for v in d))+min(max(d), 0)-.1
    return dict(feature=feature, local=local, separation=separation,
                broadFaceMargin=min(span-abs(local[0]), .5-abs(local[2])))


identity = dict(x=0, y=0, z=0, w=1)
for p, expected in [((1,.15,0),'broad-face'), ((2.1,.15,0),'edge'),
                    ((2.1,.15,.6),'corner'), ((0,0,0),'interior'),
                    ((2.1,0,0),'end-face'), ((0,0,.6),'side-face')]:
    assert classify(dict(zip(('x','y','z'),p)), identity, 2)['feature'] == expected
assert classify(dict(x=-.15,y=1,z=0), dict(x=0,y=0,z=math.sqrt(.5),w=math.sqrt(.5)), 2)['feature']=='broad-face'

source, output = map(Path, sys.argv[1:])
data = json.loads(source.read_text())
cases = []
for case in data['cases']:
    counts, peaks = {}, {}
    for frame in case['frames']:
        feature = classify(frame['position'], frame['rotation'], case['span'])
        assert abs(feature['separation']-frame['separation']) < 1e-10
        key = feature['feature']
        counts[key] = counts.get(key, 0)+1
        record = dict(frame=frame['frame'], depthM=max(0,-feature['separation']),
                      broadFaceMarginM=feature['broadFaceMargin'], local=feature['local'],
                      contacts=frame['contacts'], observedNormalAngleRad=frame['maxNormalAngle'])
        if key not in peaks or record['depthM'] > peaks[key]['depthM']:
            peaks[key] = record
    cases.append({**{key: case[key] for key in ['span','hz','omega','reverse']},
                  'frameCounts': counts, 'featurePeaks': peaks})
output.write_text(json.dumps(dict(source=source.name,
    sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    analyzerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    engineSha256=data['engineSha256'], physicalAcceptance=False,
    scope='Closest box feature at saved outer-step poses. Not the cached manifold feature, within-step chronology, or a causal attribution. Broad-face margin is distance along the plane to the nearest edge; sphere radius is 0.1m.',
    cases=cases),indent=2)+'\n')
print(f'Validated and classified {sum(sum(c["frameCounts"].values()) for c in cases)} saved frames in {len(cases)} cases')
