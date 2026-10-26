import type Rapier from '../../../dist/types/rapier';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const enginePath=resolve('dist/rapier.mjs');
const R: typeof Rapier=(await import(pathToFileURL(enginePath).href)).default;
await R.init(); const cases=[];
for(const shape of ['ball','box','capsule','cylinder','cone'])for(const sleeping of [false,true])for(const kind of ['velocity','position']) {
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=4;
  const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-.5,0,0).setCcdEnabled(true));
  w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b);if(sleeping)b.sleep();
  const k=w.createRigidBody((kind==='velocity'?R.RigidBodyDesc.kinematicVelocityBased():R.RigidBodyDesc.kinematicPositionBased()).setTranslation(.5,0,0));
  const c=shape==='ball'?R.ColliderDesc.ball(.1):shape==='box'?R.ColliderDesc.cuboid(.1,.1,.1):shape==='capsule'?R.ColliderDesc.capsule(.1,.1):shape==='cylinder'?R.ColliderDesc.cylinder(.1,.1):R.ColliderDesc.cone(.1,.1);
  w.createCollider(c.setFriction(0).setRestitution(0),k);
  if(kind==='velocity')k.setLinvel({x:-120,y:0,z:0},true);else k.setNextKinematicTranslation({x:-1.5,y:0,z:0});
  w.step();cases.push({shape,sleeping,kind,bodyPosition:b.translation(),bodyVelocity:b.linvel(),bodyX:b.translation().x,targetX:k.translation().x,reversedXOrdering:k.translation().x<b.translation().x});
 }finally{w.free();}
}
writeFileSync('absolutejs/research/relative-sweep/'+(process.argv[2]??'kinematic-shape-result.json'),JSON.stringify({candidateOnly:true,scope:'Cone contact is oblique: reversed X ordering alone does not establish tunneling',engineSha256:createHash('sha256').update(readFileSync(enginePath)).digest('hex'),cases,headOnCrossings:cases.filter(c=>c.shape!=='cone'&&c.reversedXOrdering).length},null,2)+'\n');
console.log({cases:cases.length,headOnCrossings:cases.filter(c=>c.shape!=='cone'&&c.reversedXOrdering).length});
