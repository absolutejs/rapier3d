import { beforeAll, expect, test } from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async () => { await R.init(); });
const zero = { x: 0, y: 0, z: 0 };
const identity = { ...zero, w: 1 };
const distance = (a: R.Vector, b: R.Vector) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
function fixture(offset: R.Vector, hz: number, substeps: number, movingJoint = false) {
 const world = new R.World(zero); world.timestep = 1/hz; world.numSolverIterations = substeps;
 const a = world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false)
  .setTranslation(-.7-offset.x,.2-offset.y,-.1-offset.z)
  .setAdditionalMassProperties(2,offset,{x:.4,y:.4,z:.4},identity));
 const b = world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false)
  .setTranslation(.9,-.3,.4).setAdditionalMassProperties(1,zero,{x:.2,y:.2,z:.2},identity));
 const anchor = {x:1.6+offset.x,y:-.5+offset.y,z:.5+offset.z};
 const data = movingJoint ? R.JointData.revolute(anchor,zero,{x:0,y:1,z:0}) : R.JointData.fixed(anchor,identity,zero,identity);
 const joint = world.createMultibodyJoint(data,a,b,true);
 expect(world.multibodyJoints.setGeneralizedDamping(joint.handle,new Float32Array(movingJoint?7:6))).toBe(true);
 world.step();
 // Apply physical torque through the native dynamics. Descriptor velocities do
 // not initialize an articulation's generalized velocity vector.
 for (const body of [a,b]) body.addTorque({x:hz*.3,y:-hz*.2,z:hz*.4},true);
 world.step();
 for (const body of [a,b]) body.resetTorques(true);
 expect(Math.hypot(...Object.values(a.angvel()))).toBeGreaterThan(.1);
 return {world, bodies:[a,b]};
}
test('floating-root origins preserve physical motion for fixed and movable assemblies', () => {
 let maximum = 0;
 for (const hz of [60,240]) for (const substeps of [1,4]) for (const moving of [false,true]) {
  const a = fixture(zero,hz,substeps,moving), b = fixture({x:-1,y:.2,z:.6},hz,substeps,moving);
  try {
   for (let step=0;step<hz;step++) {
    a.world.step();b.world.step();
    for(let i=0;i<2;i++) {
     const x=a.bodies[i]!, y=b.bodies[i]!;
     for(const error of [distance(x.worldCom(),y.worldCom()),distance(x.linvel(),y.linvel()),distance(x.angvel(),y.angvel())]) {
      expect(Number.isFinite(error)).toBe(true);maximum=Math.max(maximum,error);
     }
    }
   }
  } finally {a.world.free();b.world.free();}
 }
 expect(maximum).toBeLessThan(5e-5);
 console.log('WASM_ORIGIN_MAXIMUM',maximum);
});
test('offset-root assembly snapshots replay exactly through free flight', () => {
 const {world,bodies} = fixture({x:-1,y:.2,z:.6},120,4,true);
 const restored = R.World.restoreSnapshot(world.takeSnapshot());
 try {
  for(let i=0;i<120;i++) {
   world.step();restored.step();
   expect(restored.takeSnapshot()).toEqual(world.takeSnapshot());
   for(const body of bodies) expect(restored.getRigidBody(body.handle).translation()).toEqual(body.translation());
  }
 } finally {world.free();restored.free();}
});
