// CPU-only alternating synthetic batches; never interpreted as hardware FPS.
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const candidatePath = new URL("../../../dist/rapier.mjs", import.meta.url).pathname;
const baselinePath = "/home/alexkahn/alex/hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs";
const candidate = (await import(candidatePath)).default;
const baseline = (await import(baselinePath)).default;
await baseline.init(); await candidate.init();
const bodies=32, assemblies=16, steps=120, warmup=3, pairs=12;
function run(R: typeof candidate) {
  const world = new R.World({x:0,y:-9.81,z:0});
  world.timestep=1/120;world.numSolverIterations=4;
  world.integrationParameters.maxCcdSubsteps=0;
  try {
    const roots=[];
    const q={x:0,y:0,z:0,w:1},zero={x:0,y:0,z:0};
    for(let i=0;i<assemblies;i++) {
      const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false)
        .setTranslation(i*10,0,0).setAdditionalMassProperties(2,{x:.1,y:.05,z:-.03},{x:.2,y:.3,z:.4},q));
      const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false)
        .setTranslation(i*10+1,.3,.2).setAdditionalMassProperties(1,zero,{x:.1,y:.15,z:.2},q));
      const joint=world.createMultibodyJoint(R.JointData.fixed({x:1,y:.3,z:.2},q,zero,q),a,b,true);
      if(!world.multibodyJoints.setGeneralizedDamping(joint.handle,new Float32Array(6)))throw Error('Damping setup failed');
      roots.push(a);
    }
    world.step();
    for(const body of roots)body.addTorque({x:36,y:-24,z:48},true);
    world.step();
    for(const body of roots)body.resetTorques(true);
    for(let i=0;i<10;i++)world.step();
    if(R===candidate) {
      world.profilerEnabled=true;world.step();
      if(world.freeAssemblyStats()?.acceptedSteps!==assemblies*4)throw Error('Benchmark did not admit every assembly');
      world.profilerEnabled=false;
    } else world.step();
    const start=performance.now();
    for(let i=0;i<steps;i++)world.step();
    return performance.now()-start;
  }finally{world.free();}
}
for(let i=0;i<warmup;i++){run(baseline);run(candidate);}
const samples:{pair:number;baselineMs:number;candidateMs:number;order:string}[]=[];
for(let pair=0;pair<pairs;pair++){
  const order=pair%2?"candidate-first":"baseline-first";
  let baselineMs:number,candidateMs:number;
  if(pair%2){candidateMs=run(candidate);baselineMs=run(baseline);}
  else{baselineMs=run(baseline);candidateMs=run(candidate);}
  samples.push({pair,baselineMs,candidateMs,order});
}
const median=(values:number[])=>{const sorted=values.toSorted((a,b)=>a-b);return (sorted[5]!+sorted[6]!)/2;};
const baselineMedian=median(samples.map(s=>s.baselineMs));
const candidateMedian=median(samples.map(s=>s.candidateMs));
const result={schemaVersion:1,scope:"CPU Bun WASM synthetic falling fixed assemblies; not FPS",bodies,assemblies,steps,warmupPairs:warmup,pairs,
  bun:Bun.version,baseline:baseline.buildInfo,candidate:candidate.buildInfo,
  baselineApiSha256:createHash("sha256").update(readFileSync(baselinePath)).digest("hex"),
  candidateApiSha256:createHash("sha256").update(readFileSync(candidatePath)).digest("hex"),
  baselineMedianMs:baselineMedian,candidateMedianMs:candidateMedian,
  medianPairedRatio:median(samples.map(s=>s.candidateMs/s.baselineMs)),
  medianPairedAdditionalMicrosecondsPerAssemblySubstep:median(samples.map(s=>(s.candidateMs-s.baselineMs)*1000/(steps*assemblies*4))),samples};
writeFileSync(new URL("wasm-cost.json",import.meta.url),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({baselineMedian,candidateMedian,ratio:result.medianPairedRatio,addedMicroseconds:result.medianPairedAdditionalMicrosecondsPerAssemblySubstep}));
