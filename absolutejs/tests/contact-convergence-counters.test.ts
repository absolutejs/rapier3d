import {beforeAll,expect,test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
function impact(mass=20,substeps=1,minimum=1,friction=0){
 const w=new R.World({x:0,y:0,z:0});w.timestep=1/60;w.numSolverIterations=substeps;
 w.integrationParameters.numInternalPgsIterations=minimum;w.integrationParameters.contact_natural_frequency=0;
 const bodies=[[-.325,.5,0],[.325,.5,0],[-.825,mass,4],[.825,mass,-4]].map(([x,m,v])=>{
  const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x!,0,0).setLinvel(v!,0,0).setCanSleep(false));
  w.createCollider(R.ColliderDesc.ball(.25).setMass(m!).setFriction(friction).setRestitution(1),b);b.recomputeMassPropertiesFromColliders();return b;
 });
 const q={x:0,y:0,z:0,w:1};const j=w.createMultibodyJoint(R.JointData.fixed({x:.65,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[0]!,bodies[1]!,true);j.setContactsEnabled(false);
 const damping=w.multibodyJoints.generalizedDamping(j.handle)!;expect(w.multibodyJoints.setGeneralizedDamping(j.handle,damping.fill(0))).toBe(true);
 return w;
}
test('convergence observations are opt-in, fresh, owned, and absent after restore',()=>{
 const w=impact();let restored:R.World|undefined;
 try{
  expect(w.contactConvergence()).toBeNull();w.step();expect(w.contactConvergence()).toBeNull();
  w.profilerEnabled=true;expect(w.contactConvergence()).toBeNull();w.step();
  const stats=w.contactConvergence()!;expect(stats).not.toBeNull();const before=w.takeSnapshot();
  const again=w.contactConvergence()!;expect(again).toEqual(stats);expect(again).not.toBe(stats);
  stats.compressionIterations=-42;expect(w.contactConvergence()!.compressionIterations).toBeGreaterThanOrEqual(0);expect(w.takeSnapshot()).toEqual(before);
  restored=R.World.restoreSnapshot(before);expect(restored.contactConvergence()).toBeNull();
  w.profilerEnabled=false;expect(w.contactConvergence()).toBeNull();w.profilerEnabled=true;expect(w.contactConvergence()).toBeNull();
 }finally{restored?.free();w.free();}
});
test('profiling does not alter physical state across coupled impacts',()=>{
 const unprofiled=impact();const profiled=R.World.restoreSnapshot(unprofiled.takeSnapshot());profiled.profilerEnabled=true;
 try{for(let step=0;step<30;step++){unprofiled.step();profiled.step();expect(profiled.takeSnapshot()).toEqual(unprofiled.takeSnapshot());expect(profiled.contactConvergence()).not.toBeNull();}}
 finally{profiled.free();unprofiled.free();}
});
test('coupled impact reports actual iterations and converged projected residuals',()=>{
 const w=impact();try{w.profilerEnabled=true;w.step();const s=w.contactConvergence()!;
  expect(s.compressionSolves).toBe(1);expect(s.compressionIterations).toBeGreaterThan(1);expect(s.compressionIterations).toBeLessThanOrEqual(256);
  expect(s.restitutionSolves).toBe(1);expect(s.restitutionIterations).toBeGreaterThan(1);expect(s.restitutionIterations).toBeLessThanOrEqual(256);
  expect(s.compressionLimitHits).toBe(0);expect(s.restitutionLimitHits).toBe(0);
  expect(s.maxCompressionResidual).toBeLessThanOrEqual(1e-6);expect(s.maxRestitutionResidual).toBeLessThanOrEqual(1e-6);
 }finally{w.free();}
});
test('large mass ratio explicitly reports exhausted budgets',()=>{
 const w=impact(1e6);try{w.profilerEnabled=true;w.step();const s=w.contactConvergence()!;
  expect(s.compressionIterations).toBe(256);expect(s.compressionLimitHits).toBe(1);expect(s.maxCompressionResidual).toBeGreaterThan(1e-6);
  expect(s.restitutionIterations).toBe(256);expect(s.restitutionLimitHits).toBe(1);expect(s.maxRestitutionResidual).toBeGreaterThan(1e-6);
 }finally{w.free();}
});
test('configured compression minimum is measured even above the default adaptive cap',()=>{
 const w=impact(20,1,300);try{w.profilerEnabled=true;w.step();const s=w.contactConvergence()!;
  expect(s.compressionIterations).toBe(300);expect(s.compressionLimitHits).toBe(0);
 }finally{w.free();}
});
test('substeps aggregate phases and a new empty step resets observations',()=>{
 const w=impact(20,4);try{w.profilerEnabled=true;w.step();const s=w.contactConvergence()!;
  expect(s.compressionSolves).toBe(4);expect(s.restitutionSolves).toBe(1);
  const bodies:R.RigidBody[]=[];w.bodies.forEach(b=>bodies.push(b));for(const b of bodies)w.removeRigidBody(b);
  w.step();expect(Object.values(w.contactConvergence()!)).toEqual([0,0,0,0,0,0,0,0]);
 }finally{w.free();}
});
test('ordinary contacts expose no eligible adaptive solves',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  w.createCollider(R.ColliderDesc.cuboid(10,.1,10));const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,.3,0).setLinvel(0,-1,0));w.createCollider(R.ColliderDesc.ball(.25).setRestitution(1),b);
  w.profilerEnabled=true;w.step();expect(Object.values(w.contactConvergence()!)).toEqual([0,0,0,0,0,0,0,0]);
 }finally{w.free();}
});
test('friction excludes adaptive compression while eligible restitution is still measured',()=>{
 const w=impact(20,1,1,.5);try{w.profilerEnabled=true;w.step();const s=w.contactConvergence()!;expect(s.compressionSolves).toBe(0);expect(s.compressionIterations).toBe(0);expect(s.restitutionSolves).toBe(1);}
 finally{w.free();}
});
