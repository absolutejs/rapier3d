import { beforeAll, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import R from '../../dist/rapier.mjs';
import captures from '../research/predictive-recycle/fixtures/captures.json';
import { qualifyPredictiveReplay } from './predictive-recycle-fixture';

beforeAll(async () => { await R.init(); });
for (const capture of captures.rows) test(`predictive feature refresh preserves ${capture.name} replay`, () => {
  const bytes = new Uint8Array(readFileSync(new URL(`../research/predictive-recycle/fixtures/${capture.name}-before.bin`, import.meta.url)));
  const result = qualifyPredictiveReplay(bytes, capture.first, capture.second);
  expect(result.exactSteps).toBe(8);
  expect(result.returnedContacts).toBeGreaterThan(0);
  expect(result.maxPenetrationM).toBeLessThanOrEqual(.001);
});
