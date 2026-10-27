/** Alternating, bounded CPU observations. Not browser FPS or production capacity. */
import {readFileSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const paths=process.argv.slice(2,4).map(p=>resolve(p)),output=process.argv[4];if(paths.length!==2||!output)throw Error('Two engines and output required');
const engines=await Promise.all(paths.map(async p=>{const R=(await import(pathToFileURL(p).href)).default;await R.init();return R;}));
const samples: {engine:number;count:number;budget:number;repeat:number;msPerStep:number}[]=[];const totalStart=performance.now();
for(const count of [16,128])for(const budget of [4,32,128])for(let repeat=0;repeat<3;repeat++)for(const index of repeat%2?[1,0]:[0,1]){
 if(performance.now()-totalStart>20000)throw Error('CPU observation exceeded 20s budget');
 const R=engines[index]!,w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.numSolverIterations=budget;w.integrationParameters.maxCcdSubsteps=0;
  for(let i=0;i<count;i++){const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(i*4,0,0).setLinvel(.2,.1,0).setAngvel({x:.4,y:.8,z:1.2}));w.createCollider(R.ColliderDesc.cuboid(.2,.05,.1),b);}
  for(let i=0;i<10;i++)w.step();const start=performance.now();
  for(let i=0;i<30;i++){w.step();if(i%4===0&&performance.now()-start>2000)throw Error('CPU sample exceeded 2s budget');}
  samples.push({engine:index,count,budget,repeat,msPerStep:(performance.now()-start)/30});
 }finally{w.free();}
}
const comparisons=[];
for(const count of [16,128])for(const budget of [4,32,128]){
 const medians=[0,1].map(engine=>samples.filter(s=>s.engine===engine&&s.count===count&&s.budget===budget).map(s=>s.msPerStep).sort((a,b)=>a-b)[1]!);
 comparisons.push({count,budget,baselineMedianMs:medians[0],candidateMedianMs:medians[1],ratio:medians[1]!/medians[0]!});
}
writeFileSync(output,JSON.stringify({scope:'Three alternating CPU samples per engine/configuration of spinning dynamic cuboids; no contacts, CCD or GPU. Timing observations only, not a statistical performance guarantee.',engines:paths.map(p=>({path:p,sha256:createHash('sha256').update(readFileSync(p)).digest('hex')})),samples,comparisons},null,2)+'\n');console.log(comparisons);
