import {beforeAll,expect,test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
for(const budget of [1,4,32,128])test(`velocity-driven path follows its prescribed rotation and displaced center of mass at ${budget} subdivisions`,()=>{
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.numSolverIterations=budget;w.integrationParameters.maxCcdSubsteps=0;
  const axis={x:1/Math.sqrt(14),y:2/Math.sqrt(14),z:3/Math.sqrt(14)},local={x:.3,y:-.2,z:.1};
  const b=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setTranslation(1,2,-1).setLinvel(3,-2,1).setAngvel({x:30*axis.x,y:30*axis.y,z:30*axis.z}));
  w.createCollider(R.ColliderDesc.ball(.2).setTranslation(local.x,local.y,local.z),b);b.recomputeMassPropertiesFromColliders();
  for(let i=0;i<30;i++)w.step();
  // Independent Rodrigues rotation of the known local center-of-mass offset.
  const angle=15,c=Math.cos(angle),s=Math.sin(angle),d=axis.x*local.x+axis.y*local.y+axis.z*local.z;
  const rotated={x:local.x*c+(axis.y*local.z-axis.z*local.y)*s+axis.x*d*(1-c),y:local.y*c+(axis.z*local.x-axis.x*local.z)*s+axis.y*d*(1-c),z:local.z*c+(axis.x*local.y-axis.y*local.x)*s+axis.z*d*(1-c)};
  const p=b.translation();expect(Math.hypot(p.x-(1+local.x+1.5-rotated.x),p.y-(2+local.y-1-rotated.y),p.z-(-1+local.z+.5-rotated.z))).toBeLessThan(3e-6);
  const q=b.rotation(),alignment=Math.abs((q.x*axis.x+q.y*axis.y+q.z*axis.z)*Math.sin(angle/2)+q.w*Math.cos(angle/2))/Math.hypot(q.x,q.y,q.z,q.w);
  expect(2*Math.acos(Math.min(1,alignment))).toBeLessThan(2e-6);
 }finally{w.free();}
});
test('prescribed position endpoint remains authoritative',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const b=w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());w.createCollider(R.ColliderDesc.ball(.1),b);
  b.setNextKinematicTranslation({x:1,y:2,z:3});b.setNextKinematicRotation({x:0,y:0,z:Math.sin(.2),w:Math.cos(.2)});w.step();
  expect(b.translation()).toEqual({x:1,y:2,z:3});expect(b.rotation().z).toBeCloseTo(Math.sin(.2),6);
 }finally{w.free();}
});
test('absolute kinematic evaluation retains existing linear and angular speed limits',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  w.timestep=1/60;w.numSolverIterations=1;w.integrationParameters.maxCcdSubsteps=0;
  const b=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setLinvel(500,0,0).setAngvel({x:0,y:0,z:200}));w.createCollider(R.ColliderDesc.ball(.1),b);w.step();
  expect(b.linvel().x).toBeCloseTo(400,3);expect(b.angvel().z).toBeCloseTo(Math.PI/4*60,3);
 }finally{w.free();}
});
