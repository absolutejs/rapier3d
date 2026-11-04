/** Exercise an extracted, audited archive rather than the development distribution. */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { ccdCandidateModes, ccdCandidateFixture } from '../tests/ccd-candidate-fixture';
import { cutFragmentFixture } from '../tests/cut-fragment-fixture';
import model from '../tests/fixtures/cut-fragment.json';
import reference from '../tests/fixtures/ccd-candidate-reference.json';
const [directory, output] = process.argv.slice(2);
if (!directory || !output) throw Error('Expected extracted package directory and output');
const root = resolve(directory);
const { default: R } = await import(pathToFileURL(resolve(root, 'dist/rapier.mjs')).href);
const { buildInfo } = await import(pathToFileURL(resolve(root, 'dist/build-info.mjs')).href);
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (manifest.version !== reference.buildInfo.packageVersion || JSON.stringify(buildInfo) !== JSON.stringify(reference.buildInfo))
  throw Error('Extracted release identity differs from qualified reference');
await R.init();
const cases = ccdCandidateModes.map(mode => {
  const actual = ccdCandidateFixture(R, mode);
  const expected = reference.cases.find(row => row.mode === mode)!;
  const hash = new Bun.CryptoHasher('sha256').update(JSON.stringify(actual)).digest('hex');
  if (hash !== expected.hash || actual.hookCalls !== expected.hookCalls || actual.collisions.length !== expected.events)
    throw Error(`Extracted archive CCD mismatch: ${mode}`);
  return { mode, hash, hookCalls: actual.hookCalls, events: actual.collisions.length };
});
const fragment = cutFragmentFixture(R, model.model);
if (!fragment.final.sleeping || fragment.seconds >= 20 || fragment.normals.maximumHorizontal !== 0)
  throw Error('Extracted archive fragment failed physical qualification');
writeFileSync(output, JSON.stringify({ passed: true, buildInfo, cases, fragment }, null, 2) + '\n');
console.log(JSON.stringify({passed:true,version:manifest.version,cases:cases.length,fragmentSeconds:fragment.seconds}));
