import {beforeAll,expect,test} from 'bun:test';
import R from '@absolutejs/rapier3d';
import {ccdCandidateModes,ccdCandidateFixture} from './ccd-candidate-fixture';
import reference from './fixtures/ccd-candidate-reference.json';
beforeAll(async()=>{await R.init();});
for(const mode of ccdCandidateModes)test(`CCD candidate ordering preserves published motion, hooks and events: ${mode}`,()=>{
 const result=ccdCandidateFixture(R,mode),expected=reference.cases.find(c=>c.mode===mode)!;
 expect(expected).toBeDefined();
 expect(new Bun.CryptoHasher('sha256').update(JSON.stringify(result)).digest('hex')).toBe(expected.hash);
 expect(result.hookCalls).toBe(expected.hookCalls);
 expect(result.collisions.length).toBe(expected.events);
},30000);
