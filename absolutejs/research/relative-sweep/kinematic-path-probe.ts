import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type Rapier from '../../../dist/types/rapier';
const enginePath = resolve(process.argv[2] ?? 'dist/rapier.mjs');
const engineSha256 = createHash('sha256').update(readFileSync(enginePath)).digest('hex');
const R: typeof Rapier = (await import(pathToFileURL(enginePath).href)).default;
await R.init();
const cases = [];
for (const cap of [1, 4, 16]) {
 for (const offset of [0, .4]) {
  const w = new R.World({x:0,y:0,z:0});
  try {
   w.timestep = 1/60; w.integrationParameters.maxCcdSubsteps = cap; w.profilerEnabled = true;
   // An unrelated impact forces global subdivisions while this prescribed path
   // translates and rotates an offset center of mass, far from the impact.
   const moving = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-.5,0,0).setLinvel(120,0,0).setCcdEnabled(true));
   const resting = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(.5,0,0));
   for (const b of [moving, resting]) w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b);
   const k = w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,10,0));
   w.createCollider(R.ColliderDesc.ball(.1).setTranslation(offset,0,0),k);
   const frames = [];
   for (let step=1;step<=3;step++) {
    const angle=step*Math.PI/3;
    const expected={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};
    k.setNextKinematicTranslation({x:2*step,y:10,z:0}); k.setNextKinematicRotation(expected);
    w.step();
    const p=k.translation(),q=k.rotation();
    const endpointError=Math.hypot(p.x-2*step,p.y-10,p.z);
    const rotationError=Math.min(Math.hypot(q.x,q.y,q.z-expected.z,q.w-expected.w),Math.hypot(q.x,q.y,q.z+expected.z,q.w+expected.w));
    frames.push({step,endpointError,rotationError,passes:w.ccdSubsteps()});
   }
   cases.push({cap,offset,frames});
  } finally {w.free();}
 }
}
const failures=cases.filter(c=>c.frames.some(f=>f.endpointError>1e-5||f.rotationError>1e-5));
writeFileSync('absolutejs/research/relative-sweep/'+(process.argv[3]??'kinematic-path-result.json'),JSON.stringify({candidateOnly:true,engineSha256,cases,failures:failures.length},null,2)+'\n');
console.log({cases:cases.length,failures:failures.length});
