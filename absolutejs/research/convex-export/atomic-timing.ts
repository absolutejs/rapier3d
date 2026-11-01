/** Paired CPU query timing, not FPS or hardware rendering qualification. */
import R,{buildInfo} from '../../../dist/rapier.mjs';
import fixture from '../../tests/fixtures/captured-convex-exports.json';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out='absolutejs/research/convex-export/atomic-timing.json';if(existsSync(out))throw Error('Evidence exists');
const hash=()=>createHash('sha256').update(readFileSync('dist/rapier.mjs')).digest('hex'),before=hash();
await R.init();const w=new R.World({x:0,y:0,z:0}),rows:any[]=[];let sink=0;const deadline=performance.now()+20000;
try{
 for(const [member,f]of fixture.members.entries()){
  const desc=f.inputIndices?R.ColliderDesc.convexMesh(Float32Array.from(f.inputPositions),Uint32Array.from(f.inputIndices)):R.ColliderDesc.convexHull(Float32Array.from(f.inputPositions));if(!desc)throw Error('Fixture rejected');const c=w.createCollider(desc);
  const atomic=()=>{const m=c.convexMeshData()!;sink+=m.vertices.length+m.indices.length;};const separate=()=>{sink+=c.vertices().length+c.indices()!.length;};
  const reference=c.convexMeshData()!;
  if(JSON.stringify(Array.from(reference.vertices))!==JSON.stringify(Array.from(c.vertices()))||JSON.stringify(Array.from(reference.indices))!==JSON.stringify(Array.from(c.indices()!)))throw Error('Output mismatch');
  for(let i=0;i<30;i++){atomic();separate();}
  for(let round=0;round<3;round++){
   const times:Record<string,number>={};for(const method of (round%2?['separate','atomic']:['atomic','separate'])){const begin=performance.now();for(let i=0;i<200;i++)(method==='atomic'?atomic:separate)();times[method]=performance.now()-begin;if(performance.now()>deadline)throw Error('20second query budget exceeded');}
   rows.push({member,round,repetitions:200,...times});
  }
  w.removeCollider(c,false);
 }
}finally{w.free();}
if(hash()!==before)throw Error('Distribution changed');const atomicMs=rows.reduce((n,r)=>n+r.atomic,0),separateMs=rows.reduce((n,r)=>n+r.separate,0);
writeFileSync(out,JSON.stringify({scope:'Paired sequential CPU query timings; not GPU/FPS, end-to-end preparation or universal speed guarantee',buildInfo,distributionSha256:before,scriptSha256:createHash('sha256').update(readFileSync(import.meta.path)).digest('hex'),rows,sink,atomicMs,separateMs,atomicOverSeparate:atomicMs/separateMs},null,2)+'\n');console.log(JSON.stringify({atomicMs,separateMs,atomicOverSeparate:atomicMs/separateMs}));
