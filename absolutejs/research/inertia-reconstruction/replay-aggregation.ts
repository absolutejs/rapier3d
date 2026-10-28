import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {measure,vector} from '../../../../rapier-rigid-reference/absolutejs/research/rigid-midpoint/measurement';
const directory=resolve('../rapier-rigid-reference/absolutejs/research/rigid-midpoint');
const baseline=JSON.parse(readFileSync(resolve(directory,'native-comparison.json'),'utf8'));
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const paths={baseline:resolve('../hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs'),candidate:resolve('dist/rapier.mjs')};
const rows=[];
for(const [engine,path] of Object.entries(paths)) {
 const R=(await import(path)).default;await R.init();
 for(const fixture of baseline.rows){
  const snapshot=resolve(directory,'snapshots',fixture.initialSnapshot.file);
  if(hash(snapshot)!==fixture.initialSnapshot.sha256)throw Error('Snapshot differs');
  const w=R.World.restoreSnapshot(new Uint8Array(readFileSync(snapshot))),compound=new R.World({x:0,y:0,z:0});
  try{
   const bodies:any[]=[];w.bodies.forEach((b:any)=>bodies.push(b));
   const expected=measure(bodies,fixture.units);
   const b=compound.createRigidBody(R.RigidBodyDesc.dynamic());
   for(const original of bodies){const p=vector(original.worldCom());compound.createCollider(R.ColliderDesc.ball(.1*fixture.units).setTranslation(...p).setMass(original.mass()),b);}
   b.recomputeMassPropertiesFromColliders();
   const actual=measure([b],fixture.units);
   const error=Math.hypot(...actual.inertia.map((v,i)=>v-expected.inertia[i]!))/Math.hypot(...expected.inertia);
   if(!Number.isFinite(error)||(engine==='candidate'&&error>1e-6))throw Error(`Tensor mismatch ${engine} ${error}`);
   rows.push({engine,fixture:fixture.initialSnapshot.file,relativeTensorError:error});
  }finally{w.free();compound.free();}
 }
}
const result={sourceSha256:hash(import.meta.path),engines:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,hash(p)])),referenceSources:Object.fromEntries(['measurement.ts','reference.ts','native-comparison.json'].map(n=>[n,hash(resolve(directory,n))])),maximumRelativeTensorError:Object.fromEntries(Object.keys(paths).map(k=>[k,Math.max(...rows.filter(r=>r.engine===k).map(r=>r.relativeTensorError))])),rows};
writeFileSync('absolutejs/research/inertia-reconstruction/replay-aggregation.json',JSON.stringify(result,null,2)+'\n');
console.log(result.maximumRelativeTensorError);
