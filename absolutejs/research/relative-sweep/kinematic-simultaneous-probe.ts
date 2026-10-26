import type Rapier from '../../../dist/types/rapier';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const enginePath=resolve('dist/rapier.mjs');
const R: typeof Rapier=(await import(pathToFileURL(enginePath).href)).default;
await R.init();
const cases=[];
for(const count of [2,4,8])for(const reversed of [false,true])for(const kind of ['velocity','position']) {
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=4;w.profilerEnabled=true;
  const indices=Array.from({length:count},(_,i)=>i);if(reversed)indices.reverse();
  const bodies=indices.map(i=>{
   const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-.5,(i-(count-1)/2)*.3,0).setCcdEnabled(true));
   w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b); b.sleep();return {i,b};
  });
  const target=w.createRigidBody((kind==='velocity'?R.RigidBodyDesc.kinematicVelocityBased():R.RigidBodyDesc.kinematicPositionBased()).setTranslation(.5,0,0));
  w.createCollider(R.ColliderDesc.cuboid(.1,count*.3,.1).setFriction(0).setRestitution(0),target);
  if(kind==='velocity')target.setLinvel({x:-120,y:0,z:0},true);else target.setNextKinematicTranslation({x:-1.5,y:0,z:0});
  w.step();
  cases.push({count,reversed,kind,targetX:target.translation().x,passes:w.ccdSubsteps(),bodies:bodies.map(({i,b})=>({i,x:b.translation().x,crossed:target.translation().x<b.translation().x,sleeping:b.isSleeping()})).sort((a,b)=>a.i-b.i)});
 }finally{w.free();}
}
const failures=cases.filter(c=>c.bodies.some(b=>b.crossed));
writeFileSync('absolutejs/research/relative-sweep/'+(process.argv[2]??'kinematic-simultaneous-result.json'),JSON.stringify({candidateOnly:true,engineSha256:createHash('sha256').update(readFileSync(enginePath)).digest('hex'),cases,failures:failures.length},null,2)+'\n');
console.log({cases:cases.length,failures:failures.length});
