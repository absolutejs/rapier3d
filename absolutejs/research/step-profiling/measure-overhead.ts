import R from '../../../dist/rapier.mjs';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
await R.init();
const input = new Uint8Array(await Bun.file('absolutejs/tests/fixtures/profiling-coupled-before.bin').arrayBuffer());
const records: {sampled:boolean;elapsedMs:number;digest:string;profile:unknown}[]=[];
for(let round=0;round<24;round++) {
 const pair=[];
 for(const sampled of round%2?[true,false]:[false,true]) {
  const world=R.World.restoreSnapshot(input);
  try {
   const recorder=sampled?R.createPhysicsStepProfiler(world,{sampleEvery:32,maxSamples:16}):null;
   const start=performance.now();
   for(let i=0;i<512;i++) {if(recorder)recorder.step();else world.step();}
   const elapsedMs=performance.now()-start;
   const digest=createHash('sha256').update(world.takeSnapshot()).digest('hex');
   pair.push(digest);
   if(round>=4)records.push({sampled,elapsedMs,digest,profile:recorder?.snapshot()??null});
  }finally {world.free();}
 }
 if(pair[0]!==pair[1])throw Error('Sampler changed physical snapshot');
}
const median=(values:number[])=>{const sorted=values.toSorted((a,b)=>a-b);return (sorted[9]!+sorted[10]!)/2;};
const report={buildInfo:R.buildInfo,scope:'CPU-only complete 512-step loop including sampler overhead, four warmup pairs plus twenty alternating measured pairs; not browser FPS',nativeSampleBudget:16,pairedSnapshotsExact:true,baselineMedianMs:median(records.filter(r=>!r.sampled).map(r=>r.elapsedMs)),sampledMedianMs:median(records.filter(r=>r.sampled).map(r=>r.elapsedMs)),records};
writeFileSync('absolutejs/research/step-profiling/overhead.json',JSON.stringify(report,null,2)+'\n');
console.log({baselineMedianMs:report.baselineMedianMs,sampledMedianMs:report.sampledMedianMs});
