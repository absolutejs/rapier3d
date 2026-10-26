/** Cold controls for contact-component clamping; no render or gameplay acceptance. */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const engine=resolve(process.argv[2]??'dist/rapier.mjs');
const output=process.argv[3];if(!output)throw Error('Explicit output path required');
const R=(await import(pathToFileURL(engine).href)).default;await R.init();
const cases=[];
for(const mode of ['touching-slide','positive-gap','sensor','solver-filter','kinematic']) {
 const w=new R.World({x:0,y:0,z:0});
 try {
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=1;
  w.integrationParameters.normalizedPredictionDistance=.1;
  w.integrationParameters.normalizedAllowedLinearError=.0001;
  const a=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,1,0).setLinvel(0,-120,0).setCcdEnabled(true));
  w.createCollider(R.ColliderDesc.cuboid(.1,.1,.1).setFriction(0).setRestitution(0),a);
  const desc=mode==='kinematic'?R.RigidBodyDesc.kinematicVelocityBased():R.RigidBodyDesc.dynamic();
  const b=w.createRigidBody(desc.setTranslation(.2+(mode==='positive-gap'?.01:0),1,0).setLinvel(0,-120,0).setCcdEnabled(true));
  const collider=R.ColliderDesc.cuboid(.1,.1,.1).setFriction(0).setRestitution(0);
  if(mode==='sensor')collider.setSensor(true);
  if(mode==='solver-filter')collider.setSolverGroups(0);
  w.createCollider(collider,b);
  w.createCollider(R.ColliderDesc.cuboid(.05,.1,.5).setTranslation(0,-.1,0).setFriction(0));
  w.stepTraceEnabled=true;w.step();
  const trace=w.stepTrace();
  const freeY=1-120*w.timestep;
  cases.push({mode,a:a.translation(),b:b.translation(),freeY,freeMotionError:Math.abs(b.translation().y-freeY),aStopped:a.translation().y>.05,trace:trace?{...trace,data:Array.from(trace.data),impacts:Array.from(trace.impacts)}:null});
 }finally{w.free();}
}
const result={engineSha256:createHash('sha256').update(readFileSync(engine)).digest('hex'),scope:'Two frictionless side-by-side bodies; only the first intersects a narrow floor. Its clamp must not drag the second tangentially. Also tests gap/sensor/filter/kinematic exclusions.',cases,failures:cases.filter(c=>!c.aStopped||c.freeMotionError>1e-4).map(c=>c.mode)};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log({failures:result.failures,cases:cases.map(c=>({mode:c.mode,error:c.freeMotionError}))});
