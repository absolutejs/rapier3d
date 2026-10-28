import {beforeAll, expect, test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
function make(inertia={x:2,y:3,z:4}) {
 const w=new R.World({x:0,y:0,z:0});w.timestep=1/240;w.numSolverIterations=4;
 w.integrationParameters.maxCcdSubsteps=0;
 const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false).setAdditionalMassProperties(1,{x:0,y:0,z:0},inertia,{x:0,y:0,z:0,w:1}));
 w.step();b.setAngvel({x:2,y:-3,z:4},true);return {w,b};
}
test('free rotation observations are fresh, owned, and absent after restore',()=>{
 const {w}=make();try {
  expect(w.freeRotationStats()).toBeNull();w.profilerEnabled=true;
  expect(w.freeRotationStats()).toBeNull();w.step();
  const stats=w.freeRotationStats()!;
  expect(stats).toMatchObject({acceptedSteps:4,nonphysicalInertiaRejections:0,rotationLimitRejections:0,invalidOrFailedSolves:0});
  expect(stats.maxNewtonIterations).toBeLessThanOrEqual(4);
  expect(stats.maxResidualRadiansPerSecond).toBeLessThan(1e-10);
  const snapshot=w.takeSnapshot();stats.acceptedSteps=-1;
  expect(w.freeRotationStats()!.acceptedSteps).toBe(4);
  expect(w.takeSnapshot()).toEqual(snapshot);
  const restored=R.World.restoreSnapshot(snapshot);
  try {expect(restored.freeRotationStats()).toBeNull();} finally {restored.free();}
  w.profilerEnabled=false;expect(w.freeRotationStats()).toBeNull();
  w.profilerEnabled=true;expect(w.freeRotationStats()).toBeNull();
 }finally{w.free();}
});
test('nonphysical moments report one rejection per solve and retain finite state',()=>{
 const {w,b}=make({x:1,y:1.0001,z:0.000001});try {
  w.profilerEnabled=true;
  for(let i=0;i<10;i++) {w.step();expect(w.freeRotationStats()).toMatchObject({acceptedSteps:0,nonphysicalInertiaRejections:1});expect(Object.values(b.angvel()).every(Number.isFinite)).toBe(true);}
 }finally{w.free();}
});
test('bounded profiles retain deep-owned free rotation counts across eligibility changes',()=>{
 const {w,b}=make();try {
  const profile=R.createPhysicsStepProfiler(w,{sampleEvery:1,maxSamples:2});
  profile.step();b.setAngularDamping(.1);profile.step();profile.step();
  const first=profile.snapshot();
  expect(first.samples.map(s=>s.native!.freeRotation.acceptedSteps)).toEqual([4,0]);
  expect(first.samplesOmittedForBudget).toBe(1);
  first.samples[0]!.native!.freeRotation.acceptedSteps=-1;
  expect(profile.snapshot().samples[0]!.native!.freeRotation.acceptedSteps).toBe(4);
  expect(w.profilerEnabled).toBe(false);
 }finally{w.free();}
});
test('free rotation observation sampling preserves exact physics snapshots',()=>{
 const {w:a,b:body}=make();const b=R.World.restoreSnapshot(a.takeSnapshot());
 try {
  const p=R.createPhysicsStepProfiler(a,{sampleEvery:3,maxSamples:4});
  for(let i=0;i<30;i++) {
   const damping=i%3===0?.1:0;body.setAngularDamping(damping);b.getRigidBody(body.handle).setAngularDamping(damping);
   p.step();b.step();expect(a.takeSnapshot()).toEqual(b.takeSnapshot());
  }
 }finally{a.free();b.free();}
});
