import { beforeAll, expect, test } from 'bun:test';
import type RAPIER from '@absolutejs/rapier3d';
const R: typeof RAPIER = (await import(process.env.RAPIER_TEST_ENGINE ?? '@absolutejs/rapier3d')).default;
beforeAll(async () => { await R.init(); });

test('a fixed assembly transfers elastic impact as a single rigid mass', () => {
 for (const hz of [60, 240, 960]) for (const units of [1,100]) for (const reverse of [false,true]) {
  const world = new R.World({x:0,y:0,z:0});
  try {
   world.timestep=1/hz; world.lengthUnit=units; world.numSolverIterations=4;
   const masses=[2,3,5], positions=[-.65,0,.65], speeds=[2,2,-2];
   const bodies: RAPIER.RigidBody[]=[];
   for(const i of reverse?[2,1,0]:[0,1,2]) {
    const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(positions[i]!*units,0,0).setLinvel(speeds[i]!*units,0,0).setCanSleep(false).setCcdEnabled(true));
    world.createCollider(R.ColliderDesc.ball(.25*units).setMass(masses[i]!).setFriction(0).setRestitution(1),body);
    bodies[i]=body;
   }
   const q={x:0,y:0,z:0,w:1};
   world.createImpulseJoint(R.JointData.fixed({x:.65*units,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[0]!,bodies[1]!,true).setContactsEnabled(false);
   let maxMismatch=0;
   for(let step=0;step<hz/2;step++) {
    world.step();
    maxMismatch=Math.max(maxMismatch,Math.abs(bodies[0]!.linvel().x-bodies[1]!.linvel().x)/units);
   }
   // Equal 5 kg assemblies exchange velocities in a lossless collinear impact.
   const expected=[-2,-2,2];let energy=0,momentum=0;
   for(let i=0;i<3;i++) {
    const v=bodies[i]!.linvel(),x=v.x/units;
    expect(Math.abs(x-expected[i]!)).toBeLessThan(2e-5);
    expect(Math.hypot(v.y,v.z)/units).toBeLessThan(1e-6);
    expect(Math.hypot(...Object.values(bodies[i]!.angvel()))).toBeLessThan(1e-6);
    energy+=.5*masses[i]!*(x*x+(v.y/units)**2+(v.z/units)**2);
    momentum+=masses[i]!*x;
   }
   expect(Math.abs(energy-20)).toBeLessThan(1e-4);
   expect(Math.abs(momentum)).toBeLessThan(2e-5);
   expect(maxMismatch).toBeLessThan(2e-5);
  } finally {world.free();}
 }
});
