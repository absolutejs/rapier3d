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
const started = performance.now();
for (const kind of ['velocity', 'position']) {
 for (const cap of [1, 4, 16]) {
  for (const sleeping of [false, true]) {
   const w = new R.World({x:0,y:0,z:0});
   try {
    w.timestep = 1/60;
    w.integrationParameters.maxCcdSubsteps = cap;
    w.profilerEnabled = true;
    const body = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-.5,0,0).setCcdEnabled(true));
    const target = w.createRigidBody((kind === 'velocity' ? R.RigidBodyDesc.kinematicVelocityBased() : R.RigidBodyDesc.kinematicPositionBased()).setTranslation(.5,0,0));
    w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0), body);
    w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0), target);
    if (sleeping) body.sleep();
    const frames = [];
    for (let step = 1; step <= 3; step++) {
     if (performance.now() - started > 15000) throw Error('Kinematic probe exceeded wall budget');
     const expectedX = .5 - 2 * step;
     if (kind === 'velocity') target.setLinvel({x:-120,y:0,z:0},true);
     else target.setNextKinematicTranslation({x:expectedX,y:0,z:0});
     w.step();
     frames.push({step,bodyX:body.translation().x,targetX:target.translation().x,targetV:target.linvel().x,endpointError:Math.abs(target.translation().x-expectedX),crossed:target.translation().x<body.translation().x,passes:w.ccdSubsteps()});
    }
    cases.push({kind,cap,sleeping,frames});
   } finally { w.free(); }
  }
 }
}
const endpointFailures = cases.filter(c => c.frames.some(f => f.endpointError > 1e-5));
const multiPassCrossings = cases.filter(c => c.cap > 1 && c.frames.some(f => f.crossed));
const result = {candidateOnly:true,engineSha256,scope:'Prescribed kinematic path and dynamic crossing observations; cap 1 is an explicit limitation',cases,endpointFailures:endpointFailures.length,multiPassCrossings:multiPassCrossings.length};
writeFileSync('absolutejs/research/relative-sweep/' + (process.argv[3] ?? 'kinematic-result.json'),JSON.stringify(result,null,2)+'\n');
console.log({cases:cases.length,endpointFailures:result.endpointFailures,multiPassCrossings:result.multiPassCrossings});
