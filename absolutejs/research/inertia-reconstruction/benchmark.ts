import { performance } from 'node:perf_hooks';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const paths = {baseline:resolve('../hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs'),candidate:resolve('dist/rapier.mjs')};
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,hash(p)]));
const engines={baseline:(await import(paths.baseline)).default,candidate:(await import(paths.candidate)).default};
for(const R of Object.values(engines))await R.init();
function run(R:any) {
 const w=new R.World({x:0,y:0,z:0});
 try {
  const b=w.createRigidBody(R.RigidBodyDesc.dynamic());
  for(const [x,y,z,mass] of [[0,0,0,2],[.65,.15,.1,3],[.2,.5,-.1,4]]) w.createCollider(R.ColliderDesc.ball(.1).setTranslation(x,y,z).setMass(mass),b);
  const start=performance.now();
  for(let i=0;i<2000;i++) b.recomputeMassPropertiesFromColliders();
  const milliseconds=performance.now()-start;
  if(b.mass()!==9)throw Error('Mass changed');
  return milliseconds;
 }finally{w.free();}
}
const rows:{baseline:number;candidate:number}[]=[];
for(let pair=0;pair<24;pair++) {
 const order=pair%2?['candidate','baseline'] as const:['baseline','candidate'] as const;
 const row={baseline:0,candidate:0};
 for(const key of order)row[key]=run(engines[key]);
 if(pair>=4)rows.push(row);
}
for(const [k,p] of Object.entries(paths))if(hash(p)!==hashes[k])throw Error('Engine changed');
const median=(v:number[])=>{v.sort((a,b)=>a-b);return(v[9]!+v[10]!)/2;};
const result={scope:'CPU collider mass-property recomputation only; no world stepping or rendering. Twenty alternating pairs after four warmup pairs, 2000 recomputations per sample. Not FPS or an all-game overhead claim.',hashes,sourceSha256:hash(import.meta.path),engines:Object.fromEntries(Object.entries(engines).map(([k,R])=>[k,R.buildInfo])),medianMilliseconds:Object.fromEntries(['baseline','candidate'].map(k=>[k,median(rows.map(r=>r[k as keyof typeof r]))])),rows};
writeFileSync('absolutejs/research/inertia-reconstruction/benchmark.json',JSON.stringify(result,null,2)+'\n');
console.log(result.medianMilliseconds);
