import { beforeAll, expect, test } from 'bun:test';
import type RAPIER from '@absolutejs/rapier3d';
const R: typeof RAPIER = (await import(process.env.RAPIER_TEST_ENGINE ?? '@absolutejs/rapier3d')).default;
beforeAll(async () => { await R.init(); });
// Compression convergence is deliberately explicit. This test isolates the
// end-of-step coupled bounce, not a recommendation for the game's step budget.
for (const e of [0, .5, 1]) for (const hz of [60, 240])
for (const substeps of [1, 4]) for (const reverse of [false, true]) {
 test(`symmetric coupled impact e=${e} hz=${hz} substeps=${substeps} reverse=${reverse}`, () => {
  const world = new R.World({x:0,y:0,z:0});
  try {
   world.timestep=1/hz;world.numSolverIterations=substeps;
   world.integrationParameters.numInternalPgsIterations=16;
   world.integrationParameters.contact_natural_frequency=0;
   const specs=[[-.325,2.5,0],[.325,2.5,0],[-.825,5,4],[.825,5,-4]];
   const bodies: RAPIER.RigidBody[]=[];
   for(const i of reverse?[3,2,1,0]:[0,1,2,3]) {
    const [x,m,v]=specs[i]!;
    const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x!,0,0).setLinvel(v!,0,0).setCanSleep(false).setCcdEnabled(true));
    world.createCollider(R.ColliderDesc.ball(.25).setMass(m!).setFriction(0).setRestitution(e),body);
    body.recomputeMassPropertiesFromColliders();bodies[i]=body;
   }
   const identity={x:0,y:0,z:0,w:1};
   const joint=world.createMultibodyJoint(R.JointData.fixed({x:.65,y:0,z:0},identity,{x:0,y:0,z:0},identity),bodies[0]!,bodies[1]!,true);
   joint.setContactsEnabled(false);
   const damping=world.multibodyJoints.generalizedDamping(joint.handle)!;
   expect(world.multibodyJoints.setGeneralizedDamping(joint.handle,damping.fill(0))).toBe(true);
   for(let step=0;step<hz/4;step++) {
    world.step();
    const velocity=bodies.map(b=>b.linvel().x);
    const energy=velocity.reduce((s,v,i)=>s+.5*specs[i]![1]!*v*v,0);
    const momentum=velocity.reduce((s,v,i)=>s+specs[i]![1]!*v,0);
    expect(energy).toBeLessThan(80.001);
    expect(Math.abs(momentum)).toBeLessThan(.0001);
    expect(Math.max(Math.abs(velocity[0]!),Math.abs(velocity[1]!),Math.abs(velocity[2]!+velocity[3]!))).toBeLessThan(.001);
   }
   const expected=[0,0,-4*e,4*e];
   const velocity=bodies.map(b=>b.linvel().x);
   for(let i=0;i<4;i++)expect(Math.abs(velocity[i]!-expected[i]!)).toBeLessThan(.001);
   const energy=velocity.reduce((s,v,i)=>s+.5*specs[i]![1]!*v*v,0);
   expect(Math.abs(energy-80*e*e)).toBeLessThan(.001);
  } finally {world.free();}
 });
}
