import {beforeAll, expect, test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
function fixture() {
 const world=new R.World({x:0,y:-9.81,z:0});
 world.timestep=1/120;world.numSolverIterations=4;
 world.integrationParameters.maxCcdSubsteps=0;
 const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false));
 const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(1,0,0).setCanSleep(false));
 for(const body of [a,b])world.createCollider(R.ColliderDesc.ball(.25).setMass(1).setCollisionGroups(0),body);
 const q={x:0,y:0,z:0,w:1};
 const joint=world.createMultibodyJoint(R.JointData.fixed({x:1,y:0,z:0},q,{x:0,y:0,z:0},q),a,b,true);
 expect(world.multibodyJoints.setGeneralizedDamping(joint.handle,new Float32Array(6))).toBe(true);
 world.step();return {world,a,b,joint};
}
test('assembly observations are fresh, owned and absent after restore',()=>{
 const {world:w}=fixture();try {
  expect(w.freeAssemblyStats()).toBeNull();w.profilerEnabled=true;
  expect(w.freeAssemblyStats()).toBeNull();w.step();
  const stats=w.freeAssemblyStats()!;
  expect(stats).toEqual({acceptedSteps:4,nonphysicalInertiaRejections:0,rotationLimitRejections:0,invalidOrFailedSolves:0});
  const bytes=w.takeSnapshot();stats.acceptedSteps=-1;
  expect(w.freeAssemblyStats()!.acceptedSteps).toBe(4);
  expect(w.takeSnapshot()).toEqual(bytes);
  const restored=R.World.restoreSnapshot(bytes);
  try {expect(restored.freeAssemblyStats()).toBeNull();} finally {restored.free();}
  w.profilerEnabled=false;expect(w.freeAssemblyStats()).toBeNull();
  w.profilerEnabled=true;expect(w.freeAssemblyStats()).toBeNull();
 }finally {w.free();}
});
test('bounded assembly profiles own samples across excluded loads and detachment',()=>{
 const {world:w,b,joint}=fixture();try {
  const profile=R.createPhysicsStepProfiler(w,{sampleEvery:1,maxSamples:3});
  profile.step();b.setGravityScale(.5,true);profile.step();
  w.removeMultibodyJoint(joint,true);profile.step();profile.step();
  const first=profile.snapshot();
  expect(first.samples.map(s=>s.native!.freeAssembly.acceptedSteps)).toEqual([4,0,0]);
  expect(first.samplesOmittedForBudget).toBe(1);
  first.samples[0]!.native!.freeAssembly.acceptedSteps=-1;
  expect(profile.snapshot().samples[0]!.native!.freeAssembly.acceptedSteps).toBe(4);
  expect(w.profilerEnabled).toBe(false);
 }finally {w.free();}
});
test('assembly observation sampling preserves exact snapshot trajectories',()=>{
 const {world:a,b:body}=fixture();const b=R.World.restoreSnapshot(a.takeSnapshot());
 try {
  const profile=R.createPhysicsStepProfiler(a,{sampleEvery:3,maxSamples:4});
  for(let i=0;i<30;i++) {
   const scale=i%3===0?.5:1;
   body.setGravityScale(scale,true);b.getRigidBody(body.handle).setGravityScale(scale,true);
   profile.step();b.step();expect(a.takeSnapshot()).toEqual(b.takeSnapshot());
  }
 }finally {a.free();b.free();}
});
