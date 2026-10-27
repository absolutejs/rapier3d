/** Longer paired CPU samples after warming each WASM module; never a browser FPS claim. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';import {loadavg} from 'node:os';
const paths=process.argv.slice(2,4).map(p=>resolve(p)),output=process.argv[4];
if(paths.length!==2||!output)throw Error('Two engines and output required');
const engines=await Promise.all(paths.map(async p=>{const R=(await import(pathToFileURL(p).href)).default;await R.init();return R;}));
function scene(R:any,count:number,budget:number){
 const world=new R.World({x:0,y:0,z:0});world.timestep=1/60;world.numSolverIterations=budget;world.integrationParameters.maxCcdSubsteps=0;
 for(let i=0;i<count;i++){const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(i*4,0,0).setLinvel(.2,.1,0).setAngvel({x:.4,y:.8,z:1.2}));world.createCollider(R.ColliderDesc.cuboid(.2,.05,.1),b);}
 return world;
}
const started=performance.now(),initialLoad=loadavg();
for(const R of engines){const w=scene(R,128,32);try{for(let i=0;i<256;i++)w.step();}finally{w.free();}}
const samples:{engine:number;count:number;budget:number;repeat:number;msPerStep:number}[]=[];
for(const count of [16,128])for(const budget of [4,32,128])for(let repeat=0;repeat<5;repeat++)for(const index of repeat%2?[1,0]:[0,1]){
 if(performance.now()-started>40000)throw Error('Warm CPU probe exceeded 40s budget');
 const w=scene(engines[index],count,budget);
 try{
  for(let i=0;i<20;i++)w.step();const sampleStart=performance.now();
  for(let i=0;i<512;i++){w.step();if(i%32===0&&performance.now()-sampleStart>2000)throw Error('CPU sample exceeded 2s budget');}
  samples.push({engine:index,count,budget,repeat,msPerStep:(performance.now()-sampleStart)/512});
 }finally{w.free();}
}
const comparisons=[];
for(const count of [16,128])for(const budget of [4,32,128]){
 const values=[0,1].map(engine=>samples.filter(s=>s.engine===engine&&s.count===count&&s.budget===budget).map(s=>s.msPerStep).sort((a,b)=>a-b));
 comparisons.push({count,budget,baselineMedianMs:values[0]![2],candidateMedianMs:values[1]![2],ratio:values[1]![2]!/values[0]![2]!,baselineRange:[values[0]![0],values[0]!.at(-1)],candidateRange:[values[1]![0],values[1]!.at(-1)]});
}
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
writeFileSync(output,JSON.stringify({scope:'Spinning dynamic cuboids, no contacts/CCD/GPU. Two warmed modules, five alternating paired samples, 512 steps per sample. Bounded timing observations, not production capacity or statistical guarantees.',sourceSha256:hash(import.meta.path),initialLoad,finalLoad:loadavg(),engines:paths.map(p=>({path:p,sha256:hash(p)})),samples,comparisons,elapsedMs:performance.now()-started},null,2)+'\n');
console.log(comparisons);
