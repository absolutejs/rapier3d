import { beforeAll, expect, test } from 'bun:test';
import type RAPIER from '@absolutejs/rapier3d';
const R: typeof RAPIER = (await import(process.env.RAPIER_TEST_ENGINE ?? '@absolutejs/rapier3d')).default;
beforeAll(async () => { await R.init(); });
for (const restitution of [0, .5, 1]) for (const hz of [60, 240]) for (const iterations of [1, 4]) for (const touching of [false, true]) {
 test(`head-on material transfer e=${restitution} hz=${hz} iterations=${iterations} touching=${touching}`, () => {
  const w = new R.World({x:0,y:0,z:0});
  try {
   w.timestep=1/hz; w.numSolverIterations=iterations;
   const bodies: RAPIER.RigidBody[]=[];
   for (const [x,m,v] of [[-.65,2,0],[0,3,0],[touching?.5:.65,5,-4]]) {
    const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x!,0,0).setLinvel(v!,0,0).setCanSleep(false).setCcdEnabled(true));
    w.createCollider(R.ColliderDesc.ball(.25).setMass(m!).setRestitution(restitution).setFriction(0),b);bodies.push(b);
   }
   const q={x:0,y:0,z:0,w:1};
   const j=w.createMultibodyJoint(R.JointData.fixed({x:.65,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[0]!,bodies[1]!,true);
   j.setContactsEnabled(false);
   const d=w.multibodyJoints.generalizedDamping(j.handle)!;
   expect(w.multibodyJoints.setGeneralizedDamping(j.handle,d.fill(0))).toBe(true);
   for(let i=0;i<hz/4;i++)w.step();
   const velocities=bodies.map(b=>b.linvel().x);
   const expected=[-2*(1+restitution),-2*(1+restitution),-2*(1-restitution)];
   for(let i=0;i<3;i++)expect(Math.abs(velocities[i]!-expected[i]!)).toBeLessThan(1e-3);
   const momentum=velocities.reduce((s,v,i)=>s+[2,3,5][i]!*v,0);
   const energy=velocities.reduce((s,v,i)=>s+.5*[2,3,5][i]!*v*v,0);
   expect(Math.abs(momentum+20)).toBeLessThan(1e-4);
   expect(Math.abs(energy-20*(1+restitution**2))).toBeLessThan(.002);
  } finally { w.free(); }
 });
}
