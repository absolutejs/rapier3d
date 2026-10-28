"""Independently predict private planar bounce energy from the inelastic state."""
import hashlib,json,math
from pathlib import Path
root=Path(__file__).resolve().parent
out=root/'energy-audit.json'
if out.exists(): raise ValueError('Refusing to overwrite evidence')
inputs={};rows=[]
def read(p):
 b=p.read_bytes();inputs[str(p)]=hashlib.sha256(b).hexdigest();return json.loads(b)
def rotate(q,v):
 # These fixtures stay planar. Check that before using the planar formula.
 assert abs(q['x'])<1e-5 and abs(q['y'])<1e-5
 c=1-2*q['z']**2;s=2*q['z']*q['w']
 return (c*v[0]-s*v[1],s*v[0]+c*v[1])
for hz in [60,240]:
 for iterations in [1,4]:
  name=f'compound-0.15-0.37-{hz}-100.json'
  base=read(root/'controls'/f'compound-{hz}-{iterations}-0'/name)[0]
  bodies=base['bodies'];gap=math.sqrt(.25-.15**2)
  n=(2*gap,.3);c=math.cos(.37);s=math.sin(.37)
  normal=(c*n[0]-s*n[1],s*n[0]+c*n[1])
  local=[(.25*n[0]+.26,.25*n[1]),(.25*n[0]-gap,.25*n[1]-.15)]
  com=[(b['com']['x']/100,b['com']['y']/100) for b in bodies]
  anchor=[rotate(b['rotation'],v) for b,v in zip(bodies,local)]
  point=tuple(sum(com[i][k]+anchor[i][k] for i in range(2))/2 for k in range(2))
  arm=[(point[0]-p[0],point[1]-p[1]) for p in com]
  cross=[r[0]*normal[1]-r[1]*normal[0] for r in arm]
  inertia=[.632,.125]
  inverse_mass=.4+sum(t*t/I for t,I in zip(cross,inertia))
  velocity=[b['velocity'] for b in bodies]
  relative=sum((velocity[1][k]-velocity[0][k])/100*normal[i] for i,k in enumerate(['x','y']))
  relative+=cross[1]*bodies[1]['angularVelocity']['z']-cross[0]*bodies[0]['angularVelocity']['z']
  for e in [.5,1]:
   actual=read(root/'controls'/f'compound-{hz}-{iterations}-{e}'/name)[0]
   assert [b['com'] for b in actual['bodies']]==[b['com'] for b in bodies]
   impulse=(e*4*n[0]-relative)/inverse_mass
   predicted=base['state']['energy']+relative*impulse+.5*inverse_mass*impulse**2
   measured=actual['state']['energy']
   error=abs(predicted-measured)
   assert error<2e-5,(hz,iterations,e,error)
   rows.append(dict(hz=hz,iterations=iterations,restitution=e,relativeNormalVelocity=relative,effectiveInverseMass=inverse_mass,impulse=impulse,predictedEnergy=predicted,measuredEnergy=measured,predictionError=error))
inputs[str(Path(__file__))]=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
out.write_text(json.dumps(dict(scope='Planar private candidate energy prediction; not qualification',inputs=inputs,cases=rows),indent=2)+'\n')
print(json.dumps(rows,indent=2))
