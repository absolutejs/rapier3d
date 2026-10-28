import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import R from '../../../dist/rapier.mjs';
const out=resolve(process.argv[2]!);mkdirSync(out);
const source='/home/alexkahn/alex/rapier-impact-research/absolutejs/research/dynamic-impact/stable-multibody-captured';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
await R.init();const rows=[];
for(const count of [2,4,8,16])for(const reverse of [false,true])for(const hz of [60,240]){
 const prefix=`${source}/first-failure-${count}-${Number(reverse)}-${hz}`;
 const receipt=JSON.parse(readFileSync(`${prefix}.json`,'utf8')),bytes=readFileSync(`${prefix}-before.bin`);
 if(hash(bytes)!==receipt.beforeSha256)throw Error('Fixture hash mismatch');
 const worlds=[R.World.restoreSnapshot(bytes),R.World.restoreSnapshot(bytes)];
 try{
  for(const w of worlds){if(hash(w.takeSnapshot())!==hash(bytes))throw Error('Restore changed state');w.step();}
  if(hash(worlds[0]!.takeSnapshot())!==hash(worlds[1]!.takeSnapshot()))throw Error('Nondeterministic replay');
  let momentum=0;worlds[0]!.bodies.forEach(b=>{momentum+=b.mass()*b.linvel().x;});
  const error=Math.abs(momentum-receipt.expectedMomentum);
  if(error>2e-4)throw Error('Replayed momentum remains stale');
  rows.push({count,reverse,hz,inputSha256:hash(bytes),afterSha256:hash(worlds[0]!.takeSnapshot()),momentum,error,roundTrip:true,repeatExact:true});
 }finally{for(const w of worlds)w.free();}
}
writeFileSync(`${out}/result.json`,JSON.stringify({engine:R.buildInfo,rows},null,2));
