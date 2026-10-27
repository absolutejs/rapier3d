"""Independent signed-distance finite differences for the finite-box constraint."""
import hashlib
import json
import math
from pathlib import Path

def dot(a,b):return sum(x*y for x,y in zip(a,b))
def add(a,b):return tuple(x+y for x,y in zip(a,b))
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def scale(a,s):return tuple(x*s for x in a)
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def norm(a):return math.sqrt(dot(a,a))
def rotate(a,axis,angle):
 axis=scale(axis,1/norm(axis));c=math.cos(angle);s=math.sin(angle)
 return add(add(scale(a,c),scale(cross(axis,a),s)),scale(axis,dot(axis,a)*(1-c)))
def sdf(q,h):
 d=[abs(x)-y for x,y in zip(q,h)]
 return norm([max(x,0) for x in d])+min(max(d),0)-.1

def witness(q,h):
 closest=[max(-y,min(y,x)) for x,y in zip(q,h)]
 off=sub(q,closest);length=norm(off)
 if length>0:return scale(off,1/length),length-.1,['interior','face','edge','corner'][sum(abs(x)>y for x,y in zip(q,h))]
 gaps=[y-abs(x) for x,y in zip(q,h)];axis=min(range(3),key=lambda i:gaps[i]);n=[0,0,0];n[axis]=-1 if q[axis]<0 else 1
 return n,-gaps[axis]-.1,'interior'

errors=[];distance_errors=[];counts={};eps=1e-6
for span in [2,20]:
 h=(span,.05,.5)
 for i in range(1,501):
  f=i%4
  # Keep samples away from nonsmooth feature ties; inside y is nearest face.
  magnitudes=[(.4*span,.02,.2),(span+.2,.02,.2),(span+.2,.13,.2),(span+.2,.13,.7)][f]
  q=tuple(x*(-1 if (i>>k)&1 else 1) for k,x in enumerate(magnitudes))
  v=(math.sin(i*.2),math.cos(i*.3),math.sin(i*.7))
  w=(math.cos(i*.8),math.sin(i*.6),math.cos(i*.4));speed=norm(w)
  n,d,feature=witness(q,h);counts[feature]=counts.get(feature,0)+1
  de=abs(d-sdf(q,h));assert de<1e-12;distance_errors.append(de)
  plus=rotate(add(q,scale(v,eps)),w,-speed*eps)
  minus=rotate(add(q,scale(v,-eps)),w,speed*eps)
  measured=(sdf(plus,h)-sdf(minus,h))/(2*eps)
  exact=dot(n,v)+dot(cross(n,q),w)
  error=abs(measured-exact);assert error<1e-7,(feature,error)
  errors.append(error)
result=dict(passed=True,cases=len(errors),featureCounts=counts,maxDistanceError=max(distance_errors),
 maxDerivativeError=max(errors),sourceSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 scope='Analytic finite-box/radius-0.1 sphere geometry, both box lengths, all sign quadrants and smooth face/edge/corner/interior regions. Feature ties are nonsmooth and excluded from centered-derivative assertions. No native solver execution or physical acceptance.')
Path(__file__).with_name('feature-controls.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
