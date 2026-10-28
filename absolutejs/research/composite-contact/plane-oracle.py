"""Independent double-precision triangle-plane separating translation bound.

No collision-engine queries. This is an upper bound on translation needed to
separate the convex solid from this triangle, not the exact minimum distance.
Both normalized f64 quaternion reconstruction and recorded native f32 vertices
are reported; they are distinct arithmetic controls.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

def sub(a,b): return [x-y for x,y in zip(a,b)]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def scale(a,s): return [v*s for v in a]
def add(a,b): return [x+y for x,y in zip(a,b)]
def rotate(q,p):
    q=scale(q,1/math.sqrt(dot(q,q)))
    t=scale(cross(q[:3],p),2)
    return add(p,add(scale(t,q[3]),cross(q[:3],t)))

source=Path(sys.argv[1]); rows=json.loads(source.read_text())['rows']; result=[]
for r in rows:
    if r['originKind']!='none' or r['seeded']: continue
    a,b,c=r['triangle']; n=cross(sub(b,a),sub(c,a)); n=scale(n,1/math.sqrt(dot(n,n)))
    if n[1]<0: n=scale(n,-1)
    sets={'native_f32_vertices':r['convexTransformedVertices'], 'normalized_f64_quaternion':[add(rotate(r['relativeRotation'],v),r['relativeTranslation']) for v in r['convexLocalVertices']]}
    controls={}
    for name,vertices in sets.items():
        signed=[dot(sub(p,a),n) for p in vertices]
        assert max(signed)>0, 'fixture assumes collider above terrain plane'
        controls[name]={'minSignedCentimetres':min(signed),'maxSignedCentimetres':max(signed),'separatingTranslationUpperBoundMillimetres':max(0,-min(signed))*10}
    result.append({'state':r['state'],'pose':r['pose'],'upwardPlaneNormal':n,'nativeManifoldDepthMillimetres':max(0,-min(p['distance'] for p in r['computed']['points']))*10,'controls':controls})
assert len(result)==4
before=next(r for r in result if r['state']=='before' and r['pose']=='collider')
assert before['nativeManifoldDepthMillimetres']>300
assert all(c['separatingTranslationUpperBoundMillimetres']<0.01 for c in before['controls'].values())
out={'scope':__doc__,'inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'rows':result}
Path(sys.argv[2]).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(result,indent=2))
