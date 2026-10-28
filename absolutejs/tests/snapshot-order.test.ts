import { beforeAll, expect, test } from 'bun:test';
import R from '@absolutejs/rapier3d';
import { equalSnapshot, wakeFixture } from './snapshot-order-fixture';
beforeAll(async () => { await R.init(); });
for (const kind of ['impulse', 'multibody'] as const) for (const count of [1, 8, 32, 64]) for (const sleeping of [false, true]) {
  test(`queued wake snapshot/replay ${kind} count=${count} sleeping=${sleeping}`, () => {
    const fixture = wakeFixture(kind, count);
    const world = fixture.world;
    let restored: R.World | undefined;
    try {
      if (sleeping) fixture.releaseSleeping();
      const before = world.takeSnapshot();
      restored = R.World.restoreSnapshot(before);
      expect(equalSnapshot(before, restored.takeSnapshot())).toBe(true);
      for (let step = 0; step < 8; step++) {
        world.step(); restored.step();
        expect(equalSnapshot(world.takeSnapshot(), restored.takeSnapshot())).toBe(true);
      }
    } finally { restored?.free(); world.free(); }
  });
}
