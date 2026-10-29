/** Bounded paired CPU cost; active resting and speculative worlds, no rendering. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type R from '../../../dist/rapier.mjs';
const out = resolve(process.argv[2]!); mkdirSync(out);
writeFileSync(`${out}/source.ts`, readFileSync(import.meta.path));
const paths = { baseline: resolve(process.env.BASELINE_ENGINE!), candidate: resolve(process.env.CANDIDATE_ENGINE!) };
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
const inputs = Object.fromEntries([import.meta.path, ...Object.values(paths)].map(p => [p, sha(readFileSync(p))]));
const engines: { name: string; api: typeof R }[] = [];
for (const [name, path] of Object.entries(paths)) { const api = (await import(path)).default; await api.init(); engines.push({ name, api }); }
const rows = [];
for (const scene of ['stationary-prediction-32', 'resting-stack-16', 'falling-grid-32']) {
  const measurements = engines.map(e => ({ ...e, samplesMs: [] as number[], physicalSha256: '', finalState: [] as unknown[] }));
  for (let trial = 0; trial < 12; trial++) for (const e of trial % 2 ? [...measurements].reverse() : measurements) {
    const api = e.api, world = new api.World({ x: 0, y: scene === 'stationary-prediction-32' ? 0 : -9.81, z: 0 });
    try {
      world.timestep = 1 / 60; world.numSolverIterations = 8;
      const bodies: R.RigidBody[] = [];
      if (scene !== 'stationary-prediction-32') world.createCollider(api.ColliderDesc.cuboid(100, .5, 100).setTranslation(0, -.5, 0).setFriction(.7));
      const count = scene === 'stationary-prediction-32' ? 64 : scene === 'resting-stack-16' ? 16 : 32;
      for (let i = 0; i < count; i++) {
        const position = scene === 'stationary-prediction-32' ? { x: Math.floor(i / 2) * 2 + (i % 2) * .201, y: 0, z: 0 }
          : scene === 'resting-stack-16' ? { x: 0, y: .5 + 1.005 * i, z: 0 } : { x: (i % 8) * 2, y: 2, z: Math.floor(i / 8) * 2 };
        const b = world.createRigidBody(api.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(position.x, position.y, position.z));
        const half = scene === 'resting-stack-16' ? .5 : .1;
        world.createCollider(api.ColliderDesc.cuboid(half, half, half).setFriction(.7), b); bodies.push(b);
      }
      if (scene !== 'falling-grid-32') for (let i = 0; i < 240; i++) world.step();
      const start = performance.now(); for (let i = 0; i < 240; i++) world.step(); const elapsed = performance.now() - start;
      const state = bodies.map((b, i) => {
        const p = b.translation(), q = b.rotation(), v = b.linvel(), w = b.angvel();
        if (![p.x,p.y,p.z,q.x,q.y,q.z,q.w,v.x,v.y,v.z,w.x,w.y,w.z].every(Number.isFinite)) throw Error('Non-finite benchmark state');
        if (scene === 'stationary-prediction-32' && (p.y !== 0 || Math.hypot(v.x,v.y,v.z,w.x,w.y,w.z) !== 0)) throw Error('Unforced speculative bodies moved');
        if (scene === 'resting-stack-16' && (Math.abs(p.x) > .05 || Math.abs(p.z) > .05 || Math.abs(p.y - (.5 + i)) > .1)) throw Error('Stack lost stability');
        if (scene === 'falling-grid-32' && p.y < .08) throw Error('Falling grid penetrated floor');
        return { p, q, v, w };
      });
      const digest = sha(JSON.stringify(state));
      if (e.physicalSha256 && e.physicalSha256 !== digest) throw Error('Repeated physical result changed');
      e.physicalSha256 = digest; e.finalState = state;
      if (trial >= 4) e.samplesMs.push(elapsed);
    } finally { world.free(); }
  }
  for (const e of measurements) {
    const sorted = [...e.samplesMs].sort((a,b) => a-b);
    rows.push({ scene, engine: e.name, buildInfo: e.api.buildInfo, samplesMs: e.samplesMs, medianMs: (sorted[3]! + sorted[4]!) / 2, physicalSha256: e.physicalSha256, finalState: e.finalState });
  }
}
for (const [path, digest] of Object.entries(inputs)) if (sha(readFileSync(path)) !== digest) throw Error('Benchmark input changed');
writeFileSync(`${out}/results.json`, JSON.stringify({ scope: 'Four warmups then eight alternating pairs of 240 steps; active bodies, setup/pre-settling/free excluded. Bounded CPU fixtures, no hardware FPS claim.', inputs, rows }, null, 2) + '\n');
console.log(rows.map(({ samplesMs, finalState, buildInfo, ...summary }) => summary));
