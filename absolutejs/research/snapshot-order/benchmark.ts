import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { wakeFixture } from '../../tests/snapshot-order-fixture';
const paths = process.argv.slice(2, 4).map(p => resolve(p));
if (paths.length !== 2 || !process.argv[4]) throw Error('Expected baseline API, candidate API and output');
const engines = [];
for (const path of paths) { const R = (await import(path)).default; await R.init(); engines.push(R); }
const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const textHash = (value: unknown) => sha(new TextEncoder().encode(JSON.stringify(value)));
const median = (values: number[]) => { const sorted = values.toSorted((a,b) => a-b); return (sorted[5]! + sorted[6]!) / 2; };
const rows = [];
for (const count of [1, 8, 32, 128]) {
  const fixtures = engines.map(R => wakeFixture('multibody', count, R));
  try {
    fixtures.forEach(f => f.releaseSleeping());
    const handles = fixtures[0]!.bodies.map(b => b.handle);
    const state = (w: typeof fixtures[0]['world']) => handles.map(h => {
      const b = w.getRigidBody(h); return [b.translation(), b.rotation(), b.linvel(), b.angvel(), b.isSleeping()];
    });
    const initialStates = fixtures.map(f => textHash(state(f.world)));
    if (initialStates[0] !== initialStates[1]) throw Error('Fixture physical states differ');
    const common = fixtures[0]!.world.takeSnapshot();
    const samples = [];
    let physicalAfter: string | undefined;
    for (let trial = 0; trial < 16; trial++) {
      const pair = [];
      for (const engine of trial % 2 ? [1, 0] : [0, 1]) {
        const captureStart = performance.now();
        let size = 0;
        for (let i = 0; i < 100; i++) size = fixtures[engine]!.world.takeSnapshot().length;
        const captureMs = performance.now() - captureStart;
        const world = engines[engine].World.restoreSnapshot(common);
        try {
          if (textHash(state(world)) !== initialStates[0]) throw Error('Restore changed physical state');
          const start = performance.now(); world.step(); const stepMs = performance.now() - start;
          const after = textHash(state(world));
          if (physicalAfter !== undefined && after !== physicalAfter) throw Error('First-wake physical states differ');
          physicalAfter = after;
          pair[engine] = { captureMs, stepMs, snapshotBytes: size };
        } finally { world.free(); }
      }
      if (trial >= 4) samples.push({ order: trial % 2 ? 'candidate-first' : 'baseline-first', baseline: pair[0], candidate: pair[1] });
    }
    if (fixtures.some((f,i) => textHash(state(f.world)) !== initialStates[i])) throw Error('Capture changed physical state');
    rows.push({ assemblies: count, bodies: count * 2, pairs: 12, warmups: 4, capturesPerMeasurement: 100,
      captureMedianPairedRatio: median(samples.map(s => s.candidate!.captureMs / s.baseline!.captureMs)),
      stepMedianPairedRatio: median(samples.map(s => s.candidate!.stepMs / s.baseline!.stepMs)),
      baselineStepMedianMs: median(samples.map(s => s.baseline!.stepMs)),
      candidateStepMedianMs: median(samples.map(s => s.candidate!.stepMs)),
      additionalMicrosecondsPerCapture: median(samples.map(s => (s.candidate!.captureMs-s.baseline!.captureMs)*10)),
      allPhysicalStatesExactlyMatch: true, samples });
  } finally { fixtures.forEach(f => f.world.free()); }
}
const result = { scope: 'CPU pending-snapshot capture and first wake after joint removal; no rendering or FPS claim; step excludes restoration and serialization', rows,
  engines: engines.map((R,i) => ({ ...R.buildInfo, apiSha256: sha(readFileSync(paths[i]!)) })),
  sourceSha256: sha(readFileSync(import.meta.path)) };
writeFileSync(resolve(process.argv[4]!), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(rows.map(({ samples, ...row }) => row), null, 2));
