import {beforeAll,expect,test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
import {fixture,measure,norm,sub} from './assembly-split-fixture';
test('unrelated assembly does not change an isolated ordinary body rotation',()=>{
 const {world:w}=fixture();
 const reference=new R.World({x:0,y:0,z:0});
 try {
  reference.timestep=w.timestep;reference.numSolverIterations=w.numSolverIterations;
  reference.integrationParameters.maxCcdSubsteps=0;
  const desc=()=>R.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(20,0,0)
   .setAdditionalMassProperties(2,{x:.2,y:-.1,z:.3},{x:.4,y:.6,z:.8},{x:0,y:0,z:0,w:1})
   .setLinvel(.3,-.2,.1).setAngvel({x:2,y:-3,z:4});
  const body=w.createRigidBody(desc()),isolated=reference.createRigidBody(desc());
  w.profilerEnabled=true;reference.profilerEnabled=true;
  for(let i=0;i<120;i++){
   w.step();reference.step();
   expect(body.rotation()).toEqual(isolated.rotation());
   expect(body.angvel()).toEqual(isolated.angvel());
   expect(body.translation()).toEqual(isolated.translation());
   expect(body.linvel()).toEqual(isolated.linvel());
   expect(w.freeRotationStats()!.acceptedSteps).toBe(4);
   expect(reference.freeRotationStats()!.acceptedSteps).toBe(4);
  }
 }finally{reference.free();w.free();}
});
test('partial fixed-chain split preserves motion and exact snapshot replay',()=>{
 const {world:w,bodies,joints}=fixture();let restored:R.World|undefined;
 try {
  const initial=measure(bodies);expect(initial.energy).toBeGreaterThan(.01);
  w.removeMultibodyJoint(joints[1]!,true);
  const snapshot=w.takeSnapshot();restored=R.World.restoreSnapshot(snapshot);
  expect(restored.takeSnapshot()).toEqual(snapshot);w.profilerEnabled=true;
  for(let i=0;i<120;i++) {
   w.step();restored.step();expect(w.takeSnapshot()).toEqual(restored.takeSnapshot());
   const now=measure(bodies);
   expect(norm(sub(now.p,initial.p))/norm(initial.p)).toBeLessThan(1e-4);
   expect(norm(sub(now.l,initial.l))/norm(initial.l)).toBeLessThan(1e-4);
   expect(Math.abs(now.energy/initial.energy-1)).toBeLessThan(1e-4);
   expect(w.freeAssemblyStats()!.acceptedSteps).toBe(8);
  }
 }finally{restored?.free();w.free();}
});
test('surviving root retains explicit damping immediately and after a split step',()=>{
 const {world:w,joints}=fixture();try {
  const damping=new Float32Array([.1,.2,.3,.4,.5,.6]);
  expect(w.multibodyJoints.setGeneralizedDamping(joints[0]!.handle,damping)).toBe(true);
  w.removeMultibodyJoint(joints[1]!,true);
  expect(w.multibodyJoints.generalizedDamping(joints[0]!.handle)).toEqual(damping);
  w.profilerEnabled=true;w.step();
  expect(w.multibodyJoints.generalizedDamping(joints[0]!.handle)).toEqual(damping);
  expect(w.multibodyJoints.generalizedDamping(joints[2]!.handle)).toEqual(new Float32Array(6));
  expect(w.freeAssemblyStats()!.acceptedSteps).toBe(4);
 }finally{w.free();}
});
test('fixed-to-dynamic root uses prescribed world COM and angular velocity',()=>{
 const {world:w,bodies}=fixture();try {
  const root=bodies[0]!;root.setBodyType(R.RigidBodyType.Fixed,true);w.step();
  root.setBodyType(R.RigidBodyType.Dynamic,true);
  const v={x:.3,y:-.2,z:.1},angular={x:2,y:-3,z:4};
  root.setLinvel(v,true);root.setAngvel(angular,true);
  const initial=measure(bodies,{center:root.worldCom(),v,w:angular});
  w.profilerEnabled=true;w.step();const now=measure(bodies);
  expect(norm(sub(now.p,initial.p))/norm(initial.p)).toBeLessThan(1e-4);
  expect(norm(sub(now.l,initial.l))/norm(initial.l)).toBeLessThan(1e-4);
  expect(Math.abs(now.energy/initial.energy-1)).toBeLessThan(1e-4);
  expect(w.freeAssemblyStats()!.acceptedSteps).toBe(4);
 }finally{w.free();}
});
