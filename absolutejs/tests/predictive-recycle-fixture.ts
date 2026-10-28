import R from '../../dist/rapier.mjs';
import { equalSnapshot } from './snapshot-order-fixture';

/** Exact captured-pair replay; no claim about all pairs or authored material. */
export function qualifyPredictiveReplay(bytes: Uint8Array, first: number, second: number, engine = R) {
  const world = engine.World.restoreSnapshot(bytes), replay = engine.World.restoreSnapshot(bytes);
  let maxPenetrationM = 0, returnedContacts = 0, exactSteps = 0;
  try {
    if (!equalSnapshot(world.takeSnapshot(), replay.takeSnapshot())) throw Error('Initial predictive replay differs');
    for (let i = 0; i < 8; i++) {
      world.step(); replay.step();
      const before = world.takeSnapshot();
      if (!equalSnapshot(before, replay.takeSnapshot())) throw Error('Predictive replay diverged');
      const contact = world.getCollider(first).contactColliderAtCurrentBodyPoses(world.getCollider(second), 0);
      if (contact) {
        if (!Number.isFinite(contact.distance)) throw Error('Invalid shape distance');
        returnedContacts++;
        maxPenetrationM = Math.max(maxPenetrationM, -contact.distance / 100);
      }
      if (!equalSnapshot(before, world.takeSnapshot())) throw Error('Shape observation mutated state');
      exactSteps++;
    }
    if (!returnedContacts || maxPenetrationM > .001) throw Error(`Predictive contact penetration ${maxPenetrationM}`);
    return { maxPenetrationM, returnedContacts, exactSteps };
  } finally { replay.free(); world.free(); }
}
