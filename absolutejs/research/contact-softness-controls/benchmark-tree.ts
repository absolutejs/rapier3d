/** CPU-only paired cost of the captured contact onset; restoration is excluded. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import R from '../../../dist/rapier.mjs';
const baselinePath=resolve(process.argv[2]!);
const baseline=(await import(baselinePath)).default;
const fixturePath='absolutejs/tests/fixtures/terrain-contact-softness-before.bin';
const input=readFileSync(fixturePath);
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');
const sources=Object.fromEntries([import.meta.path,baselinePath,'dist/rapier.mjs',fixturePath].map(p=>[p,sha(readFileSync(p))]));
const rows=[{name:'published-default',api:baseline,frequency:60,samplesMs:[] as number[],stateSha256:''},{name:'candidate-default',api:R,frequency:60,samplesMs:[] as number[],stateSha256:''},{name:'candidate-game-policy',api:R,frequency:600,samplesMs:[] as number[],stateSha256:''}];
await baseline.init();await R.init();
for(let trial=0;trial<24;trial++)for(const row of trial%2?[...rows].reverse():rows){
 let total=0;let digest='';
 for(let repeat=0;repeat<8;repeat++){
  const w=row.api.World.restoreSnapshot(input);
  try{
   if(row.api===R)w.integrationParameters.staticContactSoftness={naturalFrequency:row.frequency,dampingRatio:10};
   const start=performance.now();for(let step=0;step<32;step++)w.step();total+=performance.now()-start;
   const state:unknown[]=[];w.forEachRigidBody((b:any)=>{const p=b.translation(),q=b.rotation(),v=b.linvel(),a=b.angvel();if(![p.x,p.y,p.z,q.x,q.y,q.z,q.w,v.x,v.y,v.z,a.x,a.y,a.z].every(Number.isFinite))throw Error('Non-finite state');state.push({p,q,v,a});});
   const current=sha(Buffer.from(JSON.stringify(state)));if(digest&&current!==digest)throw Error('Repeat differs');digest=current;
  }finally{w.free();}
  if(process.memoryUsage().rss>1024**3)throw Error('RSS budget exceeded');
 }
 if(row.stateSha256&&row.stateSha256!==digest)throw Error('Trial differs');row.stateSha256=digest;
 if(trial>=12)row.samplesMs.push(total);
}
for(const[p,h]of Object.entries(sources))if(sha(readFileSync(p))!==h)throw Error('Source changed');
const result=rows.map(({name,api,frequency,samplesMs,stateSha256})=>{const sorted=[...samplesMs].sort((a,b)=>a-b),medianMs=(sorted[5]!+sorted[6]!)/2;return{name,buildInfo:api.buildInfo,frequency,dampingRatio:10,samplesMs,medianMs,msPerStep:medianMs/256,stateSha256};});
writeFileSync(process.argv[3]!,JSON.stringify({scope:'Saved tree variant 0 at step 880; eight independent 32-step spans per sample; 12 warmups then 12 alternating samples. Restore, settings, state capture and free excluded. Fixed work, not whole-fall cost or browser FPS. Physical acceptance measured separately.',sources,rows:result},null,2)+'\n');
console.log(JSON.stringify(result.map(({name,msPerStep})=>({name,msPerStep})),null,2));
