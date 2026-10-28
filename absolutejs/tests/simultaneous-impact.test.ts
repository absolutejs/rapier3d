import { beforeAll, expect, test } from 'bun:test';
import type RAPIER from '@absolutejs/rapier3d';
const R: typeof RAPIER = (await import(process.env.RAPIER_TEST_ENGINE ?? '@absolutejs/rapier3d')).default;
beforeAll(async () => { await R.init(); });

test('simultaneous elastic contacts converge to the connected three-body solution', () => {
 for (const hz of [60, 240, 960]) for (const units of [1, 100]) for (const reverse of [false,true]) {
  const world=new R.World({x:0,y:0,z:0});
  try {
   world.timestep=1/hz; world.lengthUnit=units; world.numSolverIterations=4;
   const masses=[2,5,3],positions=[-.65,.65,0],velocities=[2,-2,0];
   const bodies: RAPIER.RigidBody[]=[];
   for(const i of reverse?[2,1,0]:[0,1,2]){
    const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(positions[i]!*units,0,0).setLinvel(velocities[i]!*units,0,0).setCanSleep(false).setCcdEnabled(true));
    world.createCollider(R.ColliderDesc.ball(.25*units).setMass(masses[i]!).setRestitution(1).setFriction(0),b);bodies[i]=b;
   }
   for(let step=0;step<hz/2;step++)world.step();
   // Simultaneous connected elastic constraints plus momentum conservation:
   // v_after = 2 * center-of-mass velocity - v_before; V_com = -0.6 m/s.
   const expected=[-3.2,.8,-1.2];
   let energy=0,momentum=0;
   for(let i=0;i<3;i++){
    const v=bodies[i]!.linvel();const x=v.x/units;
    expect(Math.abs(x-expected[i]!)).toBeLessThan(2e-5);
    expect(Math.hypot(v.y,v.z)/units).toBeLessThan(1e-6);
    energy+=.5*masses[i]!*(x*x+(v.y/units)**2+(v.z/units)**2);
    momentum+=masses[i]!*x;
   }
   expect(Math.abs(energy-14)).toBeLessThan(1e-4);
   expect(Math.abs(momentum+6)).toBeLessThan(2e-5);
  }finally{world.free();}
 }
});
