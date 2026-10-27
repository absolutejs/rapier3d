import {beforeAll,expect,test} from 'bun:test';
import type RAPIER from '@absolutejs/rapier3d';
import {type V,reference,rotate,unit,quaternion,vector,norm,add,scale,angle} from '../research/gyroscopic-precision/free-spin-math';
const R:typeof RAPIER=(await import(process.env.RAPIER_TEST_ENGINE??'@absolutejs/rapier3d')).default;
beforeAll(async()=>{await R.init();});

for(const axis of [0,1,2])test(`force-free principal-axis spin does not accelerate at axis ${axis}`,()=>{
 for(const hz of [60,960])for(const budget of [32,128]){
  const w=new R.World({x:0,y:0,z:0});try{
   w.timestep=1/hz;w.numSolverIterations=budget;w.integrationParameters.maxCcdSubsteps=0;
   const velocity:V=[0,0,0];velocity[axis]=6;
   const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setAngvel({x:velocity[0],y:velocity[1],z:velocity[2]}).setCanSleep(false));
   w.createCollider(R.ColliderDesc.cuboid(20,.05,.5),b);
   for(let i=0;i<hz/10;i++)w.step();
   expect(norm(add(vector(b.angvel()),scale(velocity,-1)))).toBeLessThan(1e-6);
  }finally{w.free();}
 }
});

test('isotropic bodies preserve arbitrary force-free angular velocity',()=>{
 for(const initial of [{x:1.25,y:-2.5,z:5.75},{x:12,y:18,z:-20}]){
  const w=new R.World({x:0,y:0,z:0});try{
   w.timestep=1/960;w.numSolverIterations=128;w.integrationParameters.maxCcdSubsteps=0;
   const q=unit([.1,.2,.3,1]);
   const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setRotation({x:q[0],y:q[1],z:q[2],w:q[3]}).setAngvel(initial).setCanSleep(false));
   w.createCollider(R.ColliderDesc.ball(.1),b);const actualInitial=b.angvel();
   for(let i=0;i<96;i++)w.step();
   expect(b.angvel()).toEqual(actualInitial);
  }finally{w.free();}
 }
});

test('asymmetric free rotation retains genuine gyroscopic precession',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const hz=240,angular=scale([1,2,3],6/Math.sqrt(14));
  w.timestep=1/hz;w.numSolverIterations=32;w.integrationParameters.maxCcdSubsteps=0;
  const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setAngvel({x:angular[0],y:angular[1],z:angular[2]}).setCanSleep(false));
  w.createCollider(R.ColliderDesc.cuboid(2,.05,.5),b);
  const inertia:V=[(.05**2+.5**2)/3,(2**2+.5**2)/3,(2**2+.05**2)/3];
  const refs=reference(inertia,angular,hz,30720),ref=refs.at(-1)!;
  const expected=rotate(ref.q,ref.w);
  // A disabled gyro would keep the initial world velocity and fail this test.
  expect(norm(add(expected,scale(angular,-1)))).toBeGreaterThan(.1);
  for(let i=0;i<hz/10;i++)w.step();
  expect(norm(add(vector(b.angvel()),scale(expected,-1)))).toBeLessThan(.003);
  expect(angle(quaternion(b.rotation()),ref.q)).toBeLessThan(.0003);
 }finally{w.free();}
});
