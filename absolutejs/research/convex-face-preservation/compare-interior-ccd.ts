import {ccdCandidateFixture,ccdCandidateModes} from '../../tests/ccd-candidate-fixture';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
const rows=[];
for(const path of ['../hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs','dist/rapier.mjs']) {
 const {default:R,buildInfo}=await import(resolve(path));await R.init();
 const cases=[];
 for(const mode of ccdCandidateModes) {
  const first=ccdCandidateFixture(R,mode),second=ccdCandidateFixture(R,mode);
  const hash=(v:unknown)=>new Bun.CryptoHasher('sha256').update(JSON.stringify(v)).digest('hex');
  if(hash(first)!==hash(second))throw Error(`Non-deterministic ${mode}`);
  cases.push({mode,hash:hash(first),hookCalls:first.hookCalls,events:first.collisions.length,finalX:first.finalX,trace:first.trace,collisions:first.collisions});
 }
 rows.push({buildInfo,cases});
}
writeFileSync('absolutejs/research/convex-face-preservation/interior-ccd-comparison.json.gz',gzipSync(JSON.stringify(rows,null,2)));
for(let i=0;i<rows[0]!.cases.length;i++){const a=rows[0]!.cases[i]!,b=rows[1]!.cases[i]!;console.log(JSON.stringify({mode:a.mode,identical:a.hash===b.hash,hooks:[a.hookCalls,b.hookCalls],events:[a.events,b.events],finalX:[a.finalX,b.finalX]}));}
