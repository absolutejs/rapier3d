"""Independent step-end wall audit from frozen CCD motion (not a swept proof)."""
import gzip
import json
import math
import struct
import sys
from pathlib import Path

def f32(value):
    return struct.unpack('f', struct.pack('f', value))[0]

def rotate(v, q):
    x, y, z, w = q
    tx, ty, tz = 2*(y*v[2]-z*v[1]), 2*(z*v[0]-x*v[2]), 2*(x*v[1]-y*v[0])
    return [v[0]+w*tx+y*tz-z*ty, v[1]+w*ty+z*tx-x*tz, v[2]+w*tz+x*ty-y*tx]

rows = json.loads(gzip.decompress(Path(sys.argv[1]).read_bytes()))
output = []
for row in rows:
    for case in row['cases']:
        mode = case['mode']
        if mode not in ['pieces', 'rotating', 'restored-edit', 'translated-scaled']:
            continue
        units = 100 if mode == 'translated-scaled' else 1
        origin = [4096*units, 128*units, -512*units] if units == 100 else [0, 0, 0]
        vertices = []
        for i in range(80):
            x, y, d = (i % 5)*.04*units, (i // 5)*.04*units, .03*units
            vertices.extend([[f32(c)/units for c in v] for v in [[x,y,0], [x+d,y,0], [x,y+d,0], [x,y,d]]])
        minimum, worst = math.inf, None
        for step, trace in enumerate(case['trace']):
            body = trace[0]
            translation = [(body[k]-origin[k])/units for k in range(3)]
            wall = 6 if mode == 'restored-edit' and step >= 120 else 2
            extent = max(translation[0]+rotate(v, body[3:7])[0] for v in vertices)
            clearance = wall-.005-extent
            if clearance < minimum:
                minimum, worst = clearance, step
        output.append({'version': row['buildInfo']['packageVersion'], 'mode': mode,
                       'minimumWallPlaneClearance': minimum, 'worstStep': worst,
                       'scope': 'Float32 authored tetrahedron vertices; recorded step-end body poses; normalized units; not continuous swept clearance'})
Path(sys.argv[2]).write_text(json.dumps(output, indent=2)+'\n')
