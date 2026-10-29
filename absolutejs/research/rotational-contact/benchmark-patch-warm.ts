/** Paired CPU observations of the affected path; snapshot setup/free are excluded. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import R from '../../../dist/rapier.mjs';
import {predictiveSupportFixture} from '../../tests/predictive-support-fixture';
const baselinePath=resolve(process.argv[2]!);const baseline=(await import(baselinePath)).default;
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');
const sources=Object.fromEntries([import.meta.path,baselinePath,'dist/rapier.mjs','absolutejs/tests/predictive-support-fixture.ts'].map(p=>[p,sha(readFileSync(p))]));
const rows=[];
for(const [name,api]of [['baseline',baseline],['candidate',R]] as const){await api.init();const{w}=predictiveSupportFixture(api);try{rows.push({name,api,input:w.takeSnapshot(),samplesMs:[] as number[],finalSha256:''});}finally{w.free();}}
for(let trial=0;trial<24;trial++)for(const row of trial%2?[...rows].reverse():rows){
 let total=0;let last:Uint8Array|undefined;
 for(let repeat=0;repeat<128;repeat++){
  const w=row.api.World.restoreSnapshot(row.input);
  try{const start=performance.now();w.step();total+=performance.now()-start;if(repeat===127)last=w.takeSnapshot();}finally{w.free();}
  if(process.memoryUsage().rss>1024**3)throw Error('CPU probe memory bound exceeded');
 }
 const digest=sha(last!);if(row.finalSha256&&row.finalSha256!==digest)throw Error('Repeated physical state diverged');row.finalSha256=digest;
 if(trial>=12)row.samplesMs.push(total);
}
for(const[p,h]of Object.entries(sources))if(sha(readFileSync(p))!==h)throw Error('Source changed');
const result=rows.map(({name,api,samplesMs,finalSha256})=>{const sorted=[...samplesMs].sort((a,b)=>a-b);return{name,buildInfo:api.buildInfo,samplesMs,medianMs:(sorted[5]!+sorted[6]!)/2,finalSha256};});
writeFileSync(process.argv[3]!,JSON.stringify({scope:'One approaching tilted mesh patch, 128 independent restored steps per sample; 12 warmups then 12 alternating paired samples; setup/restoration/free excluded; CPU observations, not FPS or a speedup claim',sources,rows:result},null,2)+'\n');
console.log(JSON.stringify(result.map(({name,medianMs})=>({name,medianMs})),null,2));
