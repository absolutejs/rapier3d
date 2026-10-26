import type Rapier from '../../../dist/types/rapier';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
const enginePath=resolve(process.argv[2]??'dist/rapier.mjs');
const R: typeof Rapier=(await import(pathToFileURL(enginePath).href)).default;
await R.init();const cases=[];const started=performance.now();
for(const count of [100,500,1000])for(const sleeping of [false,true])for(const moving of [false,true]) {
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=4;w.profilerEnabled=true;
  for(let i=0;i<count;i++){
   const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(10+(i%20)*2,Math.floor(i/20)*2,0).setCcdEnabled(true));
   w.createCollider(R.ColliderDesc.ball(.1),b);if(sleeping)b.sleep();
  }
  const k=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setTranslation(-100,0,0).setLinvel(moving?-120:0,0,0));
  w.createCollider(R.ColliderDesc.ball(.1),k);
  const samples=[];
  for(let step=0;step<24;step++){
   if(performance.now()-started>15000)throw Error('Cost probe exceeded 15s wall budget');
   const before=performance.now();w.step();const elapsed=performance.now()-before;
   if(step>=8)samples.push({elapsedMs:elapsed,ccdMs:w.timingCcd(),stepMs:w.timingStep(),passes:w.ccdSubsteps()});
  }
  const sorted=samples.map(s=>s.elapsedMs).sort((a,b)=>a-b);
  cases.push({count,sleeping,moving,medianMs:sorted[8],p95Ms:sorted[15],samples});
 }finally{w.free();}
}
writeFileSync('absolutejs/research/relative-sweep/'+(process.argv[3]??'kinematic-cost-result.json'),JSON.stringify({candidateOnly:true,runtime:{bun:Bun.version,platform:process.platform,arch:process.arch,cpuModel:cpus()[0]?.model},scope:'Bounded CPU/WASM no-impact scaling observation, not browser FPS or complete performance acceptance',engineSha256:createHash('sha256').update(readFileSync(enginePath)).digest('hex'),elapsedMs:performance.now()-started,cases},null,2)+'\n');
console.log(cases.map(({samples,...summary})=>summary));
