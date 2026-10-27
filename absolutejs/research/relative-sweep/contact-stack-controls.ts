/** Cold physical and bounded-cost controls; never renders or changes game defaults. */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const engine=resolve(process.argv[2]??'dist/rapier.mjs'),output=process.argv[3];
if(!output)throw Error('Explicit output required');
const R=(await import(pathToFileURL(engine).href)).default;await R.init();
const cases=[];
for(const size of [2,8,32,64])for(const reverse of [false,true]) {
 const w=new R.World({x:0,y:0,z:0});
 try {
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=1;
  w.integrationParameters.normalizedPredictionDistance=.1;
  w.integrationParameters.normalizedAllowedLinearError=.0001;
  const bodies=Array(size);const indices=Array.from({length:size},(_,i)=>i);if(reverse)indices.reverse();
  for(const i of indices){
   const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,1+.2*i,0).setLinvel(0,-120,0).setCcdEnabled(true));
   w.createCollider(R.ColliderDesc.cuboid(.1,.1,.1).setFriction(0),b);bodies[i]=b;
  }
  // An independent falling body shares no contact; propagation must leave it free.
  const independent=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(4,1,0).setLinvel(0,-120,0).setCcdEnabled(true));
  w.createCollider(R.ColliderDesc.cuboid(.1,.1,.1),independent);
  w.createCollider(R.ColliderDesc.cuboid(.05,.1,.5).setTranslation(0,-.1,0).setFriction(0));
  const start=performance.now();w.step();const elapsedMs=performance.now()-start;
  const positions=bodies.map(b=>b.translation().y);
  const minimumClearance=Math.min(...positions.slice(1).map((y,i)=>y-positions[i]-.2));
  const maxSpeed=Math.max(...bodies.map(b=>Math.hypot(...Object.values(b.linvel()) as number[])));
  const freeMotionError=Math.abs(independent.translation().y-(1-120*w.timestep));
  cases.push({size,reverse,elapsedMs,positions,minimumClearance,maxSpeed,freeMotionError,passed:positions[0]>.05&&minimumClearance>-.001&&freeMotionError<1e-4&&maxSpeed<120.01&&elapsedMs<1000});
 }finally{w.free();}
}
const result={engineSha256:createHash('sha256').update(readFileSync(engine)).digest('hex'),scope:'Single-step aligned touching stacks, both insertion orders, independent falling body; generous 1s CPU budget per case. This is not a scalability or rotating-contact proof.',cases,passed:cases.every(c=>c.passed)};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log({passed:result.passed,cases:cases.map(({positions,...c})=>c)});if(!result.passed)process.exitCode=1;
