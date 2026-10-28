import { beforeAll, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import R from '@absolutejs/rapier3d';

beforeAll(async () => { await R.init(); });
const q = { x: 0, y: 0, z: 0, w: 1 };

for (const operation of ['insert', 'remove', 'remove-body'] as const) {
  test(`snapshot retains pending impulse topology: ${operation}`, () => {
    const world = new R.World({ x: 0, y: 0, z: 0 });
    let restored: R.World | undefined;
    try {
      const bodies = [0, 1, 2].map(x => world.createRigidBody(
        R.RigidBodyDesc.dynamic().setTranslation(x, 0, 0).setCanSleep(false)
          .setAdditionalMassProperties(1, { x: .1, y: .2, z: 0 }, { x: .2, y: .3, z: .4 }, q),
      ));
      const data = () => R.JointData.fixed({ x: 1, y: 0, z: 0 }, q, { x: 0, y: 0, z: 0 }, q);
      const joint = world.createImpulseJoint(data(), bodies[0]!, bodies[1]!, true);
      for (let i = 0; i < 3; i++) world.step();
      if (operation === 'insert') world.createImpulseJoint(data(), bodies[1]!, bodies[2]!, true);
      if (operation === 'remove') world.removeImpulseJoint(joint, true);
      if (operation === 'remove-body') world.removeRigidBody(bodies[1]!);
      const snapshot = world.takeSnapshot();
      restored = R.World.restoreSnapshot(snapshot);
      expect(restored.takeSnapshot()).toEqual(snapshot);
      for (let i = 0; i < 32; i++) {
        world.step(); restored.step();
        expect(restored.takeSnapshot()).toEqual(world.takeSnapshot());
      }
    } finally { restored?.free(); world.free(); }
  });
}

test('snapshot envelope identifies version and rejects unknown or incomplete payloads', () => {
  const world = new R.World({ x: 0, y: 0, z: 0 });
  try {
    const snapshot = world.takeSnapshot();
    expect(new TextDecoder().decode(snapshot.slice(0, 8))).toBe('ABSJS3DS');
    expect(new DataView(snapshot.buffer, snapshot.byteOffset).getUint32(8, true)).toBe(1);
    const unknown = snapshot.slice();
    new DataView(unknown.buffer).setUint32(8, 2, true);
    expect(R.World.restoreSnapshot(unknown)).toBeNull();
    for (const length of [0, 8, 11, 12, snapshot.length - 1]) {
      expect(R.World.restoreSnapshot(snapshot.slice(0, length))).toBeNull();
    }
  } finally { world.free(); }
});

test('historical raw capture imports and re-saves in the canonical envelope', () => {
  const historical = readFileSync(new URL('../research/assembly-split/snapshot-published-0150/after-cut-before-step.bin', import.meta.url));
  const world = R.World.restoreSnapshot(historical);
  let restored: R.World | undefined;
  try {
    expect(world.bodies.len()).toBe(4);
    const canonical = world.takeSnapshot();
    expect(new TextDecoder().decode(canonical.slice(0, 8))).toBe('ABSJS3DS');
    restored = R.World.restoreSnapshot(canonical);
    expect(restored.takeSnapshot()).toEqual(canonical);
    // This proves import/resave, not recovery of edits omitted by the old format.
  } finally { restored?.free(); world.free(); }
});
