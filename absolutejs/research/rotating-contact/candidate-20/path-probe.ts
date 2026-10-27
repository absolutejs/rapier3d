/** Isolated prescribed-path precision, including a displaced center of mass. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const engine=resolve(process.argv[2]!),output=process.argv[3];if(!output)throw Error('Output required');
const R=(await import(pathToFileURL(engine).href)).default;await R.init();
const axis={x:1/Math.sqrt(14),y:2/Math.sqrt(14),z:3/Math.sqrt(14)},v={x:3,y:-2,z:1},start={x:1,y:2,z:-1};
function rotate(q:any,p:any){const tx=2*(q.y*p.z-q.z*p.y),ty=2*(q.z*p.x-q.x*p.z),tz=2*(q.x*p.y-q.y*p.x);return {x:p.x+q.w*tx+q.y*tz-q.z*ty,y:p.y+q.w*ty+q.z*tx-q.x*tz,z:p.z+q.w*tz+q.x*ty-q.y*tx};}
const rows=[];
for(const kind of ['velocity','dynamic','position'])for(const budget of [1,4,32,128])for(const offset of [false,true])for(const omega of [0,6,30]){
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.numSolverIterations=budget;w.integrationParameters.maxCcdSubsteps=0;
  const local=offset?{x:.3,y:-.2,z:.1}:{x:0,y:0,z:0};
  const desc=kind==='velocity'?R.RigidBodyDesc.kinematicVelocityBased():kind==='position'?R.RigidBodyDesc.kinematicPositionBased():R.RigidBodyDesc.dynamic();
  const b=w.createRigidBody(desc.setTranslation(start.x,start.y,start.z).setLinvel(v.x,v.y,v.z).setAngvel({x:axis.x*omega,y:axis.y*omega,z:axis.z*omega}).setCanSleep(false));
  w.createCollider(R.ColliderDesc.ball(.2).setTranslation(local.x,local.y,local.z),b);b.recomputeMassPropertiesFromColliders();
  const com=b.localCom();if(Math.hypot(com.x-local.x,com.y-local.y,com.z-local.z)>1e-6)throw Error('Unexpected center of mass');
  const frames=[];
  for(let step=1;step<=30;step++){
   const t=step/60,q={x:axis.x*Math.sin(omega*t/2),y:axis.y*Math.sin(omega*t/2),z:axis.z*Math.sin(omega*t/2),w:Math.cos(omega*t/2)},rotated=rotate(q,local);
   const expected={x:start.x+local.x+v.x*t-rotated.x,y:start.y+local.y+v.y*t-rotated.y,z:start.z+local.z+v.z*t-rotated.z};
   if(kind==='position'){b.setNextKinematicTranslation(expected);b.setNextKinematicRotation(q);}
   w.step();const p=b.translation(),actualQ=b.rotation();
   const positionError=Math.hypot(p.x-expected.x,p.y-expected.y,p.z-expected.z);
   const alignment=Math.abs(actualQ.x*q.x+actualQ.y*q.y+actualQ.z*q.z+actualQ.w*q.w)/Math.hypot(actualQ.x,actualQ.y,actualQ.z,actualQ.w);
   frames.push({step,position:p,rotation:actualQ,velocity:b.linvel(),angularVelocity:b.angvel(),positionError,rotationErrorRad:2*Math.acos(Math.min(1,alignment))});
  }
  rows.push({kind,budget,offset,omega,maxPositionErrorM:Math.max(...frames.map(f=>f.positionError)),maxRotationErrorRad:Math.max(...frames.map(f=>f.rotationErrorRad)),frames});
 }finally{w.free();}
}
writeFileSync(output,JSON.stringify({physicalAcceptance:false,scope:'No-contact, no-CCD half-second trajectories; includes dynamic and position-driven controls. Analytic body origin follows a constant-velocity center of mass and fixed-axis rotation. Native f32 values have finite rounding error.',engineSha256:createHash('sha256').update(readFileSync(engine)).digest('hex'),sourceSha256:createHash('sha256').update(readFileSync(import.meta.path)).digest('hex'),rows},null,2)+'\n');
console.log(rows.map(({frames,...r})=>r));
