/** Paired CPU measurements; not rendering FPS or a contact-world throughput claim. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=process.env.BASELINE_RAPIER_ROOT;if(!root)throw Error('Explicit baseline required');
const A=(await import(resolve(root,'rapier.mjs'))).default,B=(await import(resolve('dist/rapier.mjs'))).default;await A.init();await B.init();
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const baselinePath=resolve(root,'rapier.mjs'),candidatePath=resolve('dist/rapier.mjs');
const hashes={baseline:sha(baselinePath),candidate:sha(candidatePath),source:sha(import.meta.path)};
const modes=['baseline-unprofiled','candidate-unprofiled','baseline-profiled','candidate-profiled','candidate-read-schedule'];
const warmSteps=100,rounds=7,deadline=performance.now()+120000,rows:any[]=[];
const run=(mode:string,bodies:number)=>{
 const measuredSteps=bodies===2?20000:bodies===32?2500:600;
 const api=mode.startsWith('baseline')?A:B,w=new api.World({x:0,y:0,z:0});
 try{
  w.numSolverIterations=8;w.timestep=1/120;w.profilerEnabled=!mode.endsWith('unprofiled');
  for(let i=0;i<bodies;i++){const b=w.createRigidBody(api.RigidBodyDesc.dynamic().setTranslation(i*3,0,0).setLinvel(.1,.2,.3).setCanSleep(false));b.setAdditionalSolverIterations(i%2?8:0);w.createCollider(api.ColliderDesc.ball(.25).setMass(1),b);}
  for(let i=0;i<warmSteps;i++)w.step();
  const start=performance.now();let observed=0;
  for(let i=0;i<measuredSteps;i++){w.step();if(mode==='candidate-read-schedule')observed+=w.solverSchedule().rigidBodySubsteps;}
  const elapsedMs=performance.now()-start;
  if(mode==='candidate-read-schedule'&&observed!==measuredSteps*bodies*12)throw Error('Schedule measurement did not execute expected groups');
  return {mode,bodies,measuredSteps,elapsedMs,microsecondsPerStep:elapsedMs*1000/measuredSteps};
 }finally{w.free();}
};
// Warm both modules before retaining samples. Each measured world gets its own warmup.
for(const mode of modes)run(mode,2);
for(const bodies of [2,32,128])for(let round=0;round<rounds;round++)for(let j=0;j<modes.length;j++){
 if(performance.now()>deadline)throw Error('CPU probe exceeded 120-second budget');
 const mode=modes[(j+round)%modes.length]!;rows.push({round,...run(mode,bodies)});
}
const median=(a:number[])=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)]!;
const summaries=[2,32,128].map(bodies=>{
 const medians=Object.fromEntries(modes.map(mode=>[mode,median(rows.filter(r=>r.bodies===bodies&&r.mode===mode).map(r=>r.microsecondsPerStep))]));
 const paired=(numerator:string,denominator:string)=>median(Array.from({length:rounds},(_,round)=>rows.find(r=>r.bodies===bodies&&r.round===round&&r.mode===numerator)!.elapsedMs/rows.find(r=>r.bodies===bodies&&r.round===round&&r.mode===denominator)!.elapsedMs));
 return {bodies,medianMicrosecondsPerStep:medians,medianPairedUnprofiledRatio:paired('candidate-unprofiled','baseline-unprofiled'),medianPairedProfiledRatio:paired('candidate-profiled','baseline-profiled'),medianPairedReadRatio:paired('candidate-read-schedule','candidate-profiled')};
});
if(sha(baselinePath)!==hashes.baseline||sha(candidatePath)!==hashes.candidate)throw Error('Distribution changed');
writeFileSync('absolutejs/research/solver-schedule/overhead-long.json',JSON.stringify({scope:'One-process paired Bun CPU observation, collision-free rigid groups with alternating additional iterations; timer/profiler/read costs are separate, no hardware FPS or general performance guarantee',bun:Bun.version,hashes,measuredStepsByBodyCount:{2:20000,32:2500,128:600},warmSteps,rounds,rows,summaries},null,2)+'\n');console.log(JSON.stringify(summaries));
