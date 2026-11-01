/** Exact native-state comparison against the frozen qualified predecessor. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fixture} from '../../tests/fixture';
import {wakeFixture} from '../../tests/snapshot-order-fixture';
const baselineRoot=process.env.BASELINE_RAPIER_ROOT;
if(!baselineRoot)throw Error('Explicit baseline distribution required');
const candidateRoot=resolve('dist');
const old=await import(resolve(baselineRoot,'rapier.mjs')),next=await import(resolve(candidateRoot,'rapier.mjs'));
await old.default.init();await next.default.init();
const A=old.default,B=next.default,sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const distributions=[baselineRoot,candidateRoot].map(root=>({root,sha256:sha(readFileSync(resolve(root,'rapier.mjs'))),provenance:JSON.parse(readFileSync(resolve(root,'provenance.json'),'utf8'))}));
const rows:any[]=[],deadline=performance.now()+120000;
const check=(key:string,initial:Uint8Array,steps:number)=>{
 const a=A.World.restoreSnapshot(initial),b=B.World.restoreSnapshot(initial),c=B.World.restoreSnapshot(initial);c.profilerEnabled=true;
 const digest=createHash('sha256');let maximumGroups=0,maximumBodySubsteps=0;
 try {
  for(let i=0;i<=steps;i++) {
   const x=a.takeSnapshot(),y=b.takeSnapshot(),z=c.takeSnapshot();
   if(!Buffer.from(x).equals(Buffer.from(y))||!Buffer.from(x).equals(Buffer.from(z)))throw Error(`${key}: native state differs at step ${i}`);
   digest.update(x);
   if(i===steps)break;
   if(performance.now()>deadline)throw Error('Parity audit exceeded 120-second budget');
   a.step();b.step();c.step();const observed=c.solverSchedule();if(!observed)throw Error('Missing profiled schedule');maximumGroups=Math.max(maximumGroups,observed.groupVisits);maximumBodySubsteps=Math.max(maximumBodySubsteps,observed.rigidBodySubsteps);
   const before=c.takeSnapshot();observed.groupVisits=-1;if(!Buffer.from(before).equals(Buffer.from(c.takeSnapshot())))throw Error('Schedule mutation changed native state');
  }
  const row={key,steps,initialSha256:sha(initial),stateSequenceSha256:digest.digest('hex'),exactBaselineCandidateProfiledParity:true,maximumGroups,maximumBodySubsteps};rows.push(row);
  writeFileSync('absolutejs/research/solver-schedule/parity-progress-1.json',JSON.stringify({distributions,rows},null,2)+'\n');
 }finally{a.free();b.free();c.free();}
};
for(const hz of [480,960,1920])for(const tilt of [0,.35,1]){
 const {w}=fixture(A,hz,tilt);try{check(`cavity-${hz}-${tilt}`,w.takeSnapshot(),720);}finally{w.free();}
}
for(const [name,file] of [
 ['coupled','absolutejs/tests/fixtures/profiling-coupled-before.bin'],
 ['simplex','absolutejs/tests/fixtures/simplex-floor-hull-before.bin'],
 ['predictive-floor','absolutejs/research/predictive-recycle/fixtures/tree-1-stage-3-480-before.bin'],
 ['predictive-fragment','absolutejs/research/predictive-recycle/fixtures/tree-4-stage-3-960-before.bin']
])check(name!,readFileSync(file!),120);
for(const kind of ['impulse','multibody'] as const){const f=wakeFixture(kind,8,A);try{f.releaseSleeping();check(`pending-wake-${kind}`,f.world.takeSnapshot(),60);}finally{f.world.free();}}
for(const extra of [0,8,24]){
 const w=new A.World({x:0,y:0,z:0});try{w.numSolverIterations=8;const body=w.createRigidBody(A.RigidBodyDesc.dynamic().setAngvel({x:4,y:9,z:13}).setCanSleep(false));body.setAdditionalSolverIterations(extra);w.createCollider(A.ColliderDesc.cuboid(.2,.5,.8).setMass(4),body);check(`free-anisotropic-${extra}`,w.takeSnapshot(),720);}finally{w.free();}
}
for(const d of distributions)if(sha(readFileSync(resolve(d.root,'rapier.mjs')))!==d.sha256)throw Error('Distribution changed during comparison');
writeFileSync('absolutejs/research/solver-schedule/physical-parity-1.json',JSON.stringify({scope:'Exact snapshot state at every step: predecessor, candidate unprofiled and candidate profiled; not a performance benchmark',distributions,cases:rows.length,comparedSteps:rows.reduce((n,r)=>n+r.steps,0),rows,sourceSha256:sha(readFileSync(import.meta.path)),unchangedDistributions:true},null,2)+'\n');console.log(JSON.stringify({passed:true,cases:rows.length,comparedSteps:rows.reduce((n,r)=>n+r.steps,0)}));
