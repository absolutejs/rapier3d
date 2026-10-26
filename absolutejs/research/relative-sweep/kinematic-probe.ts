import R from '../../../dist/rapier.mjs';
import {writeFileSync} from 'node:fs';
await R.init();
const cases=[];
for(const kind of ['velocity','position']) {
 const w=new R.World({x:0,y:0,z:0});
 try {
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=4;w.profilerEnabled=true;
  const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-.5,0,0).setCcdEnabled(true));
  const target=w.createRigidBody((kind==='velocity'?R.RigidBodyDesc.kinematicVelocityBased():R.RigidBodyDesc.kinematicPositionBased()).setTranslation(.5,0,0));
  w.createCollider(R.ColliderDesc.ball(.1),body);w.createCollider(R.ColliderDesc.ball(.1),target);
  if(kind==='velocity')target.setLinvel({x:-120,y:0,z:0},true);else target.setNextKinematicTranslation({x:-1.5,y:0,z:0});
  w.step();
  cases.push({kind,bodyX:body.translation().x,targetX:target.translation().x,crossed:target.translation().x<body.translation().x,passes:w.ccdSubsteps()});
 }finally{w.free();}
}
writeFileSync('absolutejs/research/relative-sweep/kinematic-result.json',JSON.stringify({scope:'Kinematic qualification observations, not acceptance',cases},null,2)+'\n');
console.log(cases);
