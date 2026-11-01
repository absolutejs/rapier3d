import {beforeAll, expect, test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
const fixture=(connected=false)=>{
 const w=new R.World({x:0,y:0,z:0});w.timestep=1/120;w.numSolverIterations=8;
 const a=w.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false));
 const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(4,0,0).setCanSleep(false));b.setAdditionalSolverIterations(8);
 w.createCollider(R.ColliderDesc.ball(.5).setMass(1),a);w.createCollider(R.ColliderDesc.ball(.5).setMass(1),b);
 if(connected)w.createImpulseJoint(R.JointData.fixed({x:2,y:0,z:0},{x:0,y:0,z:0,w:1},{x:-2,y:0,z:0},{x:0,y:0,z:0,w:1}),a,b,true);
 return w;
};
test('solver schedule is fresh, owned and explicitly empty when no rigid group exists',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
 expect(w.solverSchedule()).toBeNull();w.step();expect(w.solverSchedule()).toBeNull();w.profilerEnabled=true;expect(w.solverSchedule()).toBeNull();w.step();
 const empty={groupPasses:0,rigidBodyPasses:0,rigidBodySubsteps:0,minSubsteps:null,maxSubsteps:null,minSubstepDt:null,maxSubstepDt:null};expect(w.solverSchedule()).toEqual(empty);
 const owned=w.solverSchedule()!;owned.groupPasses=999;expect(w.solverSchedule()).toEqual(empty);
 const restored=R.World.restoreSnapshot(w.takeSnapshot());try{expect(restored.solverSchedule()).toBeNull();}finally{restored.free();}
 w.profilerEnabled=false;expect(w.solverSchedule()).toBeNull();w.profilerEnabled=true;expect(w.solverSchedule()).toBeNull();
 }finally{w.free();}
});
test('prepared groups distinguish independent extra iterations from connected propagation',()=>{
 for(const connected of [false,true]){const w=fixture(connected);try{w.profilerEnabled=true;w.step();const s=w.solverSchedule()!;
 expect(s).toMatchObject(connected?{groupPasses:1,rigidBodyPasses:2,rigidBodySubsteps:32,minSubsteps:16,maxSubsteps:16}:{groupPasses:2,rigidBodyPasses:2,rigidBodySubsteps:24,minSubsteps:8,maxSubsteps:16});
 expect(s.minSubstepDt!).toBeCloseTo(w.timestep/16,9);expect(s.maxSubstepDt!).toBeCloseTo(w.timestep/(connected?16:8),9);
 w.step();expect(w.solverSchedule()).toEqual(s);
 }finally{w.free();}}
});
test('querying and sampling schedule leave physical snapshots unchanged and own nested results',()=>{
 const a=fixture(true),b=R.World.restoreSnapshot(a.takeSnapshot());try{
 const p=R.createPhysicsStepProfiler(a,{sampleEvery:1,maxSamples:3});for(let i=0;i<5;i++){p.step();b.step();expect(a.takeSnapshot()).toEqual(b.takeSnapshot());}
 const profile=p.snapshot();expect(profile.samples).toHaveLength(3);expect(profile.samples.every(s=>s.native!.schedule.rigidBodySubsteps===32)).toBe(true);
 profile.samples[0]!.native!.schedule.groupPasses=999;expect(p.snapshot().samples[0]!.native!.schedule.groupPasses).toBe(1);
 }finally{a.free();b.free();}
});
