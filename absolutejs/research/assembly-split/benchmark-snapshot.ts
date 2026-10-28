import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const paths = process.argv.slice(2, 4).map(p => resolve(p));
if (paths.length !== 2 || !process.argv[4]) throw Error('Expected baseline API, candidate API and output JSON');
const engines = await Promise.all(paths.map(async path => {
  const R = (await import(path)).default;
  await R.init();
  return R;
}));
const worlds = engines.map(R => {
  const w = new R.World({ x: 0, y: 0, z: 0 });
  for (let i = 0; i < 128; i++) w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i, 0, 0).setAdditionalMass(1).setCanSleep(false));
  w.step();
  return w;
});
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const initial = worlds.map(w => hash(w.takeSnapshot()));
const measure = (index: number) => {
  const start = performance.now();
  let bytes = 0;
  for (let i = 0; i < 200; i++) bytes += worlds[index].takeSnapshot().length;
  return { milliseconds: performance.now() - start, bytesPerSnapshot: bytes / 200 };
};
try {
  for (let i = 0; i < 2; i++) measure(i);
  const pairs = [];
  for (let round = 0; round < 10; round++) {
    const order = round % 2 ? [1, 0] : [0, 1];
    const results: ReturnType<typeof measure>[] = [];
    for (const index of order) results[index] = measure(index);
    pairs.push({ round, order, baseline: results[0], candidate: results[1] });
  }
  const unchanged = worlds.map((w, i) => hash(w.takeSnapshot()) === initial[i]);
  if (unchanged.some(v => !v)) throw Error('Snapshot capture mutated the world');
  const median = (values: number[]) => {
    const sorted = values.toSorted((a, b) => a - b);
    return (sorted[4]! + sorted[5]!) / 2;
  };
  const result = {
    scope: 'CPU snapshot capture only; no rendering, restoration, transport or FPS claim',
    bodies: 128, snapshotsPerMeasurement: 200, pairs,
    medianPairedRatio: median(pairs.map(p => p.candidate!.milliseconds / p.baseline!.milliseconds)),
    worldUnchanged: unchanged,
    engines: engines.map((R, i) => ({ ...R.buildInfo, apiSha256: hash(readFileSync(paths[i]!)) })),
    scriptSha256: hash(readFileSync(import.meta.path)),
  };
  writeFileSync(resolve(process.argv[4]!), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ medianPairedRatio: result.medianPairedRatio, bytes: pairs[0], worldUnchanged: unchanged }));
} finally { for (const w of worlds) w.free(); }
