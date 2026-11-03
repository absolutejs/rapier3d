import { resolve } from 'node:path';
import { ccdCandidateModes, ccdCandidateFixture } from '../../tests/ccd-candidate-fixture';
import reference from '../../tests/fixtures/ccd-candidate-reference.json';
const root = resolve('.absolutejs/archive-consumer-0.21.2/package');
const { default: R, buildInfo } = await import(root + '/dist/rapier.mjs');
if (buildInfo.packageVersion !== '0.21.2' || buildInfo.wasmSha256 !== '36203be9bdcc2a65f39e44601bf878c5a622be877982a2ef2ad3b6ce7e74f47a') throw Error('Archive identity mismatch');
await R.init();
const cases = [];
for (const mode of ccdCandidateModes) {
 const result = ccdCandidateFixture(R, mode);
 const hash = new Bun.CryptoHasher('sha256').update(JSON.stringify(result)).digest('hex');
 const expected = reference.cases.find(c => c.mode === mode)!;
 if (hash !== expected.hash || result.hookCalls !== expected.hookCalls || result.collisions.length !== expected.events) throw Error(`Archive reference mismatch: ${mode}`);
 cases.push({ mode, hash, hookCalls: result.hookCalls, events: result.collisions.length });
}
await Bun.write('absolutejs/release/0.21.2/extracted-consumer.json', JSON.stringify({ passed: true, buildInfo, scope: 'exact extracted archive; ten published motion/event/hook references', cases }, null, 2) + '\n');
console.log('Exact archive consumer: ten reference scenarios passed');
