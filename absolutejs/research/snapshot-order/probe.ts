import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const enginePath = resolve(process.argv[2]!);
const output = resolve(process.argv[3]!);
const R = (await import(enginePath)).default;
await R.init(); mkdirSync(output);
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const rows = [];
for (const count of [1, 8, 32, 64]) {
  const world = new R.World({ x: 0, y: 0, z: 0 });
  const handles: number[] = [];
  world.timestep = 1 / 60; world.numSolverIterations = 1;
  world.integrationParameters.numInternalPgsIterations = 1;
  world.integrationParameters.contact_natural_frequency = 0;
  const state = (w: typeof world) => JSON.stringify(handles.map(handle => {
    const b = w.getRigidBody(handle);
    return { handle, position: b.translation(), rotation: b.rotation(), linear: b.linvel(), angular: b.angvel(), mass: b.mass(), com: b.worldCom(), inertia: b.principalInertia() };
  }));
  try {
    for (let i = 0; i < count; i++) {
      const bodies = [];
      for (const [offset, mass, vx] of [[-.325, .5, 0], [.325, .5, 0], [-.825, 20, 4], [.825, 20, -4]]) {
        const b = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i * 4 + offset!, 0, 0).setLinvel(vx!, 0, 0).setCanSleep(false).setCcdEnabled(true));
        world.createCollider(R.ColliderDesc.ball(.25).setMass(mass!).setFriction(0).setRestitution(1), b);
        b.recomputeMassPropertiesFromColliders(); bodies.push(b); handles.push(b.handle);
      }
      const q = { x: 0, y: 0, z: 0, w: 1 };
      const joint = world.createMultibodyJoint(R.JointData.fixed({ x: .65, y: 0, z: 0 }, q, { x: 0, y: 0, z: 0 }, q), bodies[0], bodies[1], true);
      joint.setContactsEnabled(false);
      if (!world.multibodyJoints.setGeneralizedDamping(joint.handle, world.multibodyJoints.generalizedDamping(joint.handle).fill(0))) throw Error('Damping rejected');
    }
    for (const phase of ['fresh', 'stepped']) {
      if (phase === 'stepped') world.step();
      let before: Uint8Array = world.takeSnapshot();
      const physical = state(world);
      writeFileSync(join(output, `${count}-${phase}-initial.bin`), before);
      for (let round = 0; round < 5; round++) {
        const restored = R.World.restoreSnapshot(before);
        try {
          const after: Uint8Array = restored.takeSnapshot();
          const differences = [];
          for (let i = 0; i < Math.max(before.length, after.length); i++) if (before[i] !== after[i]) differences.push({ offset: i, before: before[i], after: after[i] });
          rows.push({ count, phase, round, bytes: [before.length, after.length], differenceCount: differences.length, differences: differences.slice(0, 128), physicalExact: state(restored) === physical, beforeSha256: hash(before), afterSha256: hash(after) });
          writeFileSync(join(output, `${count}-${phase}-${round}.bin`), after);
          before = after;
        } finally { restored.free(); }
      }
    }
  } finally { world.free(); }
}
const result = { engine: R.buildInfo, engineApiSha256: hash(readFileSync(enginePath)), sourceSha256: hash(readFileSync(import.meta.path)), allSnapshotsExact: rows.every(row => row.differenceCount === 0), allPhysicalStatesExact: rows.every(row => row.physicalExact), rows };
writeFileSync(join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ snapshots: result.allSnapshotsExact, physical: result.allPhysicalStatesExact, failures: rows.filter(row => row.differenceCount > 0).map(({ differences, ...row }) => row) }, null, 2));
if (!result.allSnapshotsExact || !result.allPhysicalStatesExact) process.exitCode = 1;
