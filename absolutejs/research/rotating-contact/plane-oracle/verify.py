"""Independent rotating plane/sphere constraint oracle; no Rapier execution.
Normal points out of the plane. c = n dot (sphere_center-plane_center)-h-r.
The plane's angular Jacobian is n cross (sphere_center-plane_center).
Sphere angular Jacobian is zero: sphere orientation cannot change separation.
"""
import hashlib
import json
import math
from pathlib import Path


def dot(a,b): return sum(x*y for x,y in zip(a,b))
def add(a,b): return tuple(x+y for x,y in zip(a,b))
def sub(a,b): return tuple(x-y for x,y in zip(a,b))
def scale(a,s): return tuple(x*s for x in a)
def cross(a,b): return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def norm(a): return math.sqrt(dot(a,a))
def unit(a): return scale(a,1/norm(a))
def rotate(a,axis,angle):
    axis=unit(axis)
    return add(add(scale(a,math.cos(angle)),scale(cross(axis,a),math.sin(angle))),scale(axis,dot(axis,a)*(1-math.cos(angle))))
def separation(n,d,h=.05,r=.1): return dot(n,d)-h-r

def derivative(n,d,relative_velocity,plane_omega):
    return dot(n,relative_velocity)+dot(cross(n,d),plane_omega)

# Deterministic directions, translations and angular velocities: avoid random dependencies.
errors=[]; invariance=[]
eps=1e-6
for i in range(1,1001):
    n=unit((math.sin(i*.71),math.cos(i*.43),math.sin(i*.37)+.2))
    d=(math.sin(i)*3,math.cos(i*.7)*2,math.sin(i*.3))
    v=(math.cos(i*.2),math.sin(i*.4),math.cos(i*.8))
    omega=(math.sin(i*.5),math.cos(i*.6),math.sin(i*.9))
    speed=norm(omega)
    plus=separation(rotate(n,omega,speed*eps),add(d,scale(v,eps)))
    minus=separation(rotate(n,omega,-speed*eps),add(d,scale(v,-eps)))
    err=abs((plus-minus)/(2*eps)-derivative(n,d,v,omega))
    assert err<2e-9, err
    errors.append(err)
    axis=(.3,.7,.2); angle=.13*i
    invariant=abs(separation(rotate(n,axis,angle),rotate(d,axis,angle))-separation(n,d))
    assert invariant<1e-12
    invariance.append(invariant)

# Normal-only transport with body-fixed witnesses overestimates separation.
# Initially: plane anchor=(x,h,0), sphere witness=center-r*n0.
# At angle theta, plane anchor rotates, sphere is translated but not rotated.
# Moving n while retaining sphere witness gives exact separation+r*(1-cos(theta)).
rows=[]
for theta in [0,.00625,.025,.1,.125,.5]:
    n=rotate((0,1,0),(0,0,1),theta)
    plane_anchor=rotate((1,.05,0),(0,0,1),theta)
    for center in [(1,.15,0),(1.3,.16,0),(-.4,.2,.1)]:
        sphere_anchor=sub(center,(0,.1,0))
        exact=separation(n,center)
        transported=dot(n,sub(sphere_anchor,plane_anchor))
        predicted=.1*(1-math.cos(theta))
        assert abs((transported-exact)-predicted)<1e-14
        stale_sphere_arm=(0,-.1,0)
        false_torque=norm(cross(stale_sphere_arm,n))
        assert abs(false_torque-.1*abs(math.sin(theta)))<1e-14
        # Solid unit-mass sphere: I=2/5*r^2. A stale arm invents angular mass.
        mass_ratio=1/(1+false_torque**2/(.4*.1**2))
        rows.append(dict(falseSphereTorqueArmM=false_torque,
                         staleToExactEffectiveMassRatio=mass_ratio,
                         angleRad=theta,center=center,exactSeparationM=exact,
                         transportedAnchorSeparationM=transported,biasM=transported-exact))
# Counterexample: exact touching, transported witnesses claim positive separation.
theta=.5;n=rotate((0,1,0),(0,0,1),theta)
center=add(scale(n,.15),rotate((1,0,0),(0,0,1),theta))
assert abs(separation(n,center))<1e-14
false_gap=dot(n,sub(sub(center,(0,.1,0)),rotate((1,.05,0),(0,0,1),theta)))
assert false_gap>.012

result=dict(passed=True,physicalAcceptance=False,engineExecuted=False,
    derivativeCases=len(errors),maxDerivativeError=max(errors),
    rigidRotationCases=len(invariance),maxInvarianceError=max(invariance),
    touchingCounterexampleFalseGapM=false_gap,anchorBiasCases=rows,
    sourceSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    scope='Analytic infinite plane against a sphere. Valid for a cuboid broad face only while the closest feature remains that face. Not a replay of internal solver anchors and not a general convex contact algorithm.')
Path(__file__).with_name('result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='anchorBiasCases'},indent=2))
