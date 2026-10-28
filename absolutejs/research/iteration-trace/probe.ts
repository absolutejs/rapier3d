import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const baselinePath=resolve(process.env.TRACE_BASELINE_API ?? '../hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs');
const candidatePath=resolve('dist/rapier.mjs');
const baseline=(await import(baselinePath)).default;
const candidate=(await import(candidatePath)).default;
await baseline.init();await candidate.init();
const hash=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
function input(mass:number,friction:number,reverse:boolean) {
 const w=new baseline.World({x:0,y:0,z:0});
 try {
  w.timestep=1/60;w.numSolverIterations=1;
  w.integrationParameters.numInternalPgsIterations=1;
  w.integrationParameters.contact_natural_frequency=0;
  const specs=[[-.325,.5,0],[.325,.5,0],[-.825,mass,4],[.825,mass,-4]];
  const bodies:any[]=[];
  for(const i of reverse?[3,2,1,0]:[0,1,2,3]) {
   const [x,m,v]=specs[i]!;
   const b=w.createRigidBody(baseline.RigidBodyDesc.dynamic().setTranslation(x,0,0).setLinvel(v,0,0).setCanSleep(false));
   w.createCollider(baseline.ColliderDesc.ball(.25).setMass(m).setFriction(friction).setRestitution(1),b);b.recomputeMassPropertiesFromColliders();bodies[i]=b;
  }
  const q={x:0,y:0,z:0,w:1};
  const j=w.createMultibodyJoint(baseline.JointData.fixed({x:.65,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[0],bodies[1],true);j.setContactsEnabled(false);
  const d=w.multibodyJoints.generalizedDamping(j.handle);if(!w.multibodyJoints.setGeneralizedDamping(j.handle,d.fill(0)))throw Error('Damping failed');
  return w.takeSnapshot();
 } finally {w.free();}
}
const rows=[];
for(const mass of [1,5,20,100])for(const friction of [0,.5])for(const reverse of [false,true]) {
 const snapshot=input(mass,friction,reverse);
 const a=baseline.World.restoreSnapshot(snapshot),b=candidate.World.restoreSnapshot(snapshot),c=candidate.World.restoreSnapshot(snapshot);
 try {
  b.profilerEnabled=true;
  if(b.physicsPipeline.raw.restitution_trace()!==undefined)throw Error('Unexpected fresh trace');
  for(let step=0;step<30;step++) {
   a.step();b.step();c.step();
   const ah=hash(a.takeSnapshot()),bh=hash(b.takeSnapshot()),ch=hash(c.takeSnapshot());
   if(ah!==bh||ah!==ch)throw Error(`Physical snapshot differs: ${JSON.stringify({mass,friction,reverse,step,ah,bh,ch})}`);
   const raw=b.physicsPipeline.raw.restitution_trace();
   if(!raw||raw.length!==2+raw[0]*8||raw[0]>256)throw Error('Invalid trace shape');
   const trace=Array.from({length:raw[0]},(_,i)=>Array.from(raw.slice(2+i*8,10+i*8)));
   if(trace.length)rows.push({mass,friction,reverse,step,snapshotHash:ah,convergence:b.contactConvergence(),dropped:raw[1],trace});
   const before=hash(b.takeSnapshot());raw[0]=999;
   if(b.physicsPipeline.raw.restitution_trace()[0]===999||hash(b.takeSnapshot())!==before)throw Error('Trace ownership/query mutation');
  }
 } finally {a.free();b.free();c.free();}
}
writeFileSync('absolutejs/research/iteration-trace/results.json',JSON.stringify({scope:'Read-only private restitution state trace; not a timing benchmark',baseline:baseline.buildInfo,candidate:candidate.buildInfo,apiHashes:{baseline:hash(readFileSync(baselinePath)),candidate:hash(readFileSync(candidatePath))},snapshotComparisons:480,profiledAndUnprofiledExact:true,columns:['phase','sweep','residual','maxVelocityDelta','maxPreciseImpulseDelta','maxStoredImpulseDelta','maxAbsVelocity','preciseImpulseSum'],rows},null,2)+'\n');
console.log(`480 exact paired snapshots; ${rows.length} traced phases`);
