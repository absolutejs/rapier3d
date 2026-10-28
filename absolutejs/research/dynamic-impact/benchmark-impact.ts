import type RAPIER from '@absolutejs/rapier3d';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const [baselinePath,candidatePath,outputPath]=process.argv.slice(2);
if(!baselinePath||!candidatePath||!outputPath)throw Error('Expected baseline/candidate API paths and new output directory');
const out=resolve(outputPath);mkdirSync(dirname(out),{recursive:true});mkdirSync(out);
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const paths=[resolve(baselinePath),resolve(candidatePath)];
const identities=paths.map(path=>({path,sha256:hash(path)}));
const engines: (typeof RAPIER)[]=[];
for(const path of paths){const R=(await import(path)).default as typeof RAPIER;await R.init();engines.push(R);}
writeFileSync(resolve(out,'manifest.json'),JSON.stringify({identities,samples:60,warmups:10,scope:'CPU first-impact world.step only; restoration excluded; same snapshot; alternated engine order; no FPS inference'},null,2));
const rows=[];
for(const count of [2,16,64]){
 const R=engines[0]!;const initial=new R.World({x:0,y:0,z:0});
 let snapshot:Uint8Array;
 try{
  initial.timestep=1/960;initial.lengthUnit=100;initial.numSolverIterations=4;
  for(let i=0;i<count;i++){
   const side=i%2===0?-1:1;
   const b=initial.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(side*25.1,Math.floor(i/2)*300+side*12,0).setLinvel(-side*200,0,0).setCanSleep(false).setCcdEnabled(true));
   initial.createCollider(R.ColliderDesc.cuboid(25,18,12).setMass(side<0?2:5).setRestitution(1).setFriction(0),b);
  }
  snapshot=initial.takeSnapshot();
 }finally{initial.free();}
 writeFileSync(resolve(out,`input-${count}.bin`),snapshot);
 const samples:[number[],number[]]=[[],[]];
 const solverPairs=[0,0];
 for(let repeat=-10;repeat<60;repeat++)for(const index of repeat%2===0?[0,1]:[1,0]){
  const world=engines[index]!.World.restoreSnapshot(snapshot);
  try{
   if(!Buffer.from(world.takeSnapshot()).equals(Buffer.from(snapshot)))throw Error('Benchmark input decoding changed');
   const start=performance.now();world.step();const elapsed=performance.now()-start;
   if(repeat===-10){
    let pairs=0;
    world.forEachCollider(c=>world.contactPairsWith(c,other=>{if(other.handle>c.handle){let active=false;world.contactPair(c,other,m=>{active ||= m.numSolverContacts()>0;});if(active)pairs++;}}));
    if(pairs!==count/2)throw Error('Benchmark did not exercise every intended contact pair');
    solverPairs[index]=pairs;
   }
   if(repeat>=0)samples[index]!.push(elapsed);
  }finally{world.free();}
 }
 const stats=samples.map(values=>{const sorted=[...values].sort((a,b)=>a-b);return {medianMs:sorted[30],p95Ms:sorted[56],minimumMs:sorted[0],samplesMs:values};});
 rows.push({solverPairs,bodies:count,independentPairs:count/2,baseline:stats[0],candidate:stats[1],inputSha256:createHash('sha256').update(snapshot).digest('hex')});
 writeFileSync(resolve(out,'results.json'),JSON.stringify(rows,null,2));
}
if(identities.some(x=>hash(x.path)!==x.sha256))throw Error('Benchmark engine changed');
writeFileSync(resolve(out,'complete.json'),JSON.stringify({rows:rows.length,enginesUnchanged:true},null,2));
console.log(JSON.stringify(rows.map(({baseline,candidate,...r})=>({...r,baselineMedianMs:baseline!.medianMs,candidateMedianMs:candidate!.medianMs})),null,2));
