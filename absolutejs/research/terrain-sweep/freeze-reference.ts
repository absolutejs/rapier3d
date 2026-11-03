import R,{buildInfo} from '../../../../hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs';
import {ccdCandidateModes,ccdCandidateFixture} from '../../tests/ccd-candidate-fixture';
if(buildInfo.packageVersion!=='0.21.1')throw Error('Reference requires published 0.21.1');
await R.init();
const cases=[];
for(const mode of ccdCandidateModes){
 const result=ccdCandidateFixture(R,mode);
 cases.push({mode,hash:new Bun.CryptoHasher('sha256').update(JSON.stringify(result)).digest('hex'),hookCalls:result.hookCalls,events:result.collisions.length,finalX:result.finalX});
 console.log(mode,cases.at(-1));
}
await Bun.write('absolutejs/tests/fixtures/ccd-candidate-reference.json',JSON.stringify({buildInfo,cases},null,2)+'\n');
