import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const api = resolve(process.argv[2]!);
const out = resolve(process.argv[3]!);
const R = (await import(api)).default;
await R.init(); mkdirSync(out);
const w = new R.World({ x: 0, y: 0, z: 0 });
let restored: typeof w | undefined;
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
try {
  const bodies = [], joints = [];
  const q = { x: 0, y: 0, z: 0, w: 1 };
  for (let i = 0; i < 32; i++) {
    const pair = [0, 1].map(j => w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i * 4 + j, 0, 0)
      .setAdditionalMassProperties(1, { x: 0, y: 0, z: 0 }, { x: .2, y: .2, z: .2 }, q)));
    bodies.push(...pair);
    joints.push(w.createMultibodyJoint(R.JointData.fixed({ x: 1, y: 0, z: 0 }, q, { x: 0, y: 0, z: 0 }, q), pair[0], pair[1], true));
  }
  for (let i = 0; i < 180; i++) w.step();
  const asleep = bodies.filter(b => b.isSleeping()).length;
  if (asleep !== bodies.length) throw Error(`Fixture requires all bodies asleep: ${asleep}/${bodies.length}`);
  for (const joint of joints) w.removeMultibodyJoint(joint, true);
  const stillSleepingAfterRemoval = bodies.filter(b => b.isSleeping()).length;
  const snapshot = w.takeSnapshot(); writeFileSync(join(out, 'before.bin'), snapshot);
  restored = R.World.restoreSnapshot(snapshot);
  const roundtrip = restored.takeSnapshot(); writeFileSync(join(out, 'roundtrip.bin'), roundtrip);
  const state = (world: typeof w) => JSON.stringify(bodies.map(b => {
    const body = world.getRigidBody(b.handle);
    return { handle: body.handle, position: body.translation(), rotation: body.rotation(), linear: body.linvel(), angular: body.angvel(), sleeping: body.isSleeping() };
  }));
  const rows = [];
  for (let step = 1; step <= 8; step++) {
    w.step(); restored.step();
    const a = w.takeSnapshot(), b = restored.takeSnapshot();
    rows.push({ step, snapshotExact: hash(a) === hash(b), physicalExact: state(w) === state(restored), bytes: [a.length, b.length], originalSha256: hash(a), restoredSha256: hash(b) });
    if (step === 1) { writeFileSync(join(out, 'first-original.bin'), a); writeFileSync(join(out, 'first-restored.bin'), b); }
  }
  const result = { engine: R.buildInfo, apiSha256: hash(readFileSync(api)), sourceSha256: hash(readFileSync(import.meta.path)), asleep, stillSleepingAfterRemoval, roundtripExact: hash(snapshot) === hash(roundtrip), rows };
  writeFileSync(join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (!result.roundtripExact || rows.some(row => !row.snapshotExact || !row.physicalExact)) process.exitCode = 1;
} finally { restored?.free(); w.free(); }
