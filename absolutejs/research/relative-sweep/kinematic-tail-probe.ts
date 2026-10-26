import type Rapier from '../../../dist/types/rapier';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const enginePath=resolve(process.argv[2]??'dist/rapier.mjs');
const R: typeof Rapier=(await import(pathToFileURL(enginePath).href)).default;
await R.init();const cases=[];
for(const fraction of [.99,.995,.999]){
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=4;
  const a=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-.5,0,0).setLinvel(.795/(fraction/60),0,0).setCcdEnabled(true));
  const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.5,0,0));
  for(const body of [a,b])w.createCollider(R.ColliderDesc.ball(.1),body);
  const k=w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,10,0));
  w.createCollider(R.ColliderDesc.ball(.1),k);k.setNextKinematicTranslation({x:2,y:10,z:0});w.step();
  cases.push({fraction,endpointX:k.translation().x,error:Math.abs(k.translation().x-2)});
 }finally{w.free();}
}
const result={candidateOnly:true,engineSha256:createHash('sha256').update(readFileSync(enginePath)).digest('hex'),cases,failures:cases.filter(c=>c.error>1e-5).length};
writeFileSync('absolutejs/research/relative-sweep/'+(process.argv[3]??'kinematic-tail-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(result.cases);
