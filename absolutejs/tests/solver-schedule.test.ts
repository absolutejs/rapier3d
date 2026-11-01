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

test('schedule sums CCD group passes and resets independently of the CCD counter',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
 w.timestep=1/60;w.numSolverIterations=8;w.integrationParameters.maxCcdSubsteps=4;w.profilerEnabled=true;
 w.createCollider(R.ColliderDesc.cuboid(.01,2,2));
 const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-1,0,0).setLinvel(120,0,0).setCcdEnabled(true).setCanSleep(false));w.createCollider(R.ColliderDesc.ball(.1),b);
 w.step();expect(w.ccdSubsteps()).toBe(2);const split=w.solverSchedule()!;
 expect(split).toMatchObject({groupPasses:2,rigidBodyPasses:2,rigidBodySubsteps:16,minSubsteps:8,maxSubsteps:8});
 expect(split.minSubstepDt!).toBeGreaterThan(0);expect(split.maxSubstepDt!).toBeLessThanOrEqual(w.timestep/8);
 b.setTranslation({x:-2,y:0,z:0},true);b.setLinvel({x:0,y:0,z:0},true);b.setAngvel({x:0,y:0,z:0},true);w.step();
 expect(w.ccdSubsteps()).toBe(0);expect(w.solverSchedule()).toMatchObject({groupPasses:1,rigidBodyPasses:1,rigidBodySubsteps:8});expect(w.solverSchedule()!.minSubstepDt!).toBeCloseTo(w.timestep/8,9);
 }finally{w.free();}
});
test('contact connectivity propagates additional substeps without confusing PGS sweeps',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
 w.numSolverIterations=8;w.integrationParameters.numInternalPgsIterations=7;w.profilerEnabled=true;
 for(const [x,extra] of [[0,0],[.9,8]]) {const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x!,0,0).setCanSleep(false));b.setAdditionalSolverIterations(extra!);w.createCollider(R.ColliderDesc.ball(.5).setMass(1),b);}
 w.step();expect(w.solverSchedule()).toMatchObject({groupPasses:1,rigidBodyPasses:2,rigidBodySubsteps:32,minSubsteps:16,maxSubsteps:16});
 }finally{w.free();}
});

test('serialized schedule validation rejects inconsistent counts and preserves null versus zero',()=>{
 const s={groupPasses:2,rigidBodyPasses:3,rigidBodySubsteps:32,minSubsteps:8,maxSubsteps:16,minSubstepDt:.001,maxSubstepDt:.002};
 expect(R.isSolverScheduleStats(s)).toBe(true);expect(R.isSolverScheduleStats({...s,minSubstepDt:0})).toBe(true);
 for(const patch of [{groupPasses:4},{rigidBodyPasses:0},{rigidBodySubsteps:23},{rigidBodySubsteps:49},{minSubsteps:0},{maxSubsteps:7},{minSubstepDt:-1},{maxSubstepDt:.0001},{maxSubstepDt:Infinity},{rigidBodySubsteps:2**53},{minSubsteps:null}])expect(R.isSolverScheduleStats({...s,...patch})).toBe(false);
 const empty={groupPasses:0,rigidBodyPasses:0,rigidBodySubsteps:0,minSubsteps:null,maxSubsteps:null,minSubstepDt:null,maxSubstepDt:null};expect(R.isSolverScheduleStats(empty)).toBe(true);expect(R.isSolverScheduleStats({...empty,minSubstepDt:0})).toBe(false);expect(R.isSolverScheduleStats({...empty,rigidBodyPasses:1})).toBe(false);
 const huge={...s,groupPasses:1,rigidBodyPasses:Number.MAX_SAFE_INTEGER,rigidBodySubsteps:Number.MAX_SAFE_INTEGER,minSubsteps:1,maxSubsteps:2};expect(R.isSolverScheduleStats(huge)).toBe(true);expect(R.isSolverScheduleStats({...huge,minSubsteps:2})).toBe(false);
 expect(R.isSolverScheduleStats(null)).toBe(false);expect(R.isSolverScheduleStats([])).toBe(false);expect(R.isSolverScheduleStats(Object.create(s))).toBe(false);expect(R.isSolverScheduleStats({...s,minSubsteps:'8'})).toBe(false);
 let invoked=false;const getter={...s};Object.defineProperty(getter,'groupPasses',{get(){invoked=true;return 2;}});expect(R.isSolverScheduleStats(getter)).toBe(false);expect(invoked).toBe(false);expect(R.isSolverScheduleStats(new Proxy(s,{getOwnPropertyDescriptor(){throw Error('no');}}))).toBe(false);
 expect(s.groupPasses).toBe(2);
});
