import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {rk4Step} from '../../../../rapier-rigid-reference/absolutejs/research/rigid-midpoint/rk4';
import {rotationDistance,type State,type M} from '../../../../rapier-rigid-reference/absolutejs/research/rigid-midpoint/reference';
const directory=resolve('absolutejs/research/rigid-midpoint-native');
const sources=[import.meta.path,resolve('../rapier-rigid-reference/absolutejs/research/rigid-midpoint/rk4.ts'),resolve('../rapier-rigid-reference/absolutejs/research/rigid-midpoint/reference.ts')];
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(sources.map(p=>[p,hash(p)]));
const rows=[];let maximumRefinementAngle=0,maximumRefinementMomentum=0;
for(const principal of [[2,3,4],[.005,1,1],[1,1,2],[1,1.1,1.2]])for(const omega of [[2,-3,4],[.2,.3,.4],[0,0,8]]){
 const inverse:M=[1/principal[0]!,0,0,0,1/principal[1]!,0,0,0,1/principal[2]!];
 const initial:State={rotation:[0,0,0,1],momentum:[principal[0]!*omega[0]!,principal[1]!*omega[1]!,principal[2]!*omega[2]!]};
 const integrate=(hz:number)=>{let state=structuredClone(initial);for(let i=0;i<hz;i++)state=rk4Step(state,inverse,1/hz);return state;};
 const coarse=integrate(7680),fine=integrate(15360);
 maximumRefinementAngle=Math.max(maximumRefinementAngle,rotationDistance(coarse.rotation,fine.rotation));
 maximumRefinementMomentum=Math.max(maximumRefinementMomentum,Math.hypot(...coarse.momentum.map((v,i)=>v-fine.momentum[i]!)));
 rows.push([...principal,...omega,...fine.rotation,...fine.momentum]);
}
if(maximumRefinementAngle>1e-10||maximumRefinementMomentum>1e-9)throw Error('Reference not refined');
for(const p of sources)if(hash(p)!==hashes[p])throw Error('Reference source changed');
const fixture=resolve(directory,'rotation-fixtures.csv');
writeFileSync(fixture,rows.map(r=>r.map(v=>v.toPrecision(17)).join(',')).join('\n')+'\n');
const receipt={scope:'Independent double RK4, one second, principal-frame diagonal inertia, identity initial attitude. 7680 versus 15360 steps per second.',cases:rows.length,maximumRefinementAngle,maximumRefinementMomentum,hashes,fixtureSha256:hash(fixture)};
writeFileSync(resolve(directory,'reference-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(receipt);
