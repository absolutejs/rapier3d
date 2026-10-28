import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { rk4Step } from '../../../../rapier-rigid-reference/absolutejs/research/rigid-midpoint/rk4';
import { normalize, multiply, rotate, rotationDistance, type M, type Q, type V, type State } from '../../../../rapier-rigid-reference/absolutejs/research/rigid-midpoint/reference';
const directory=resolve('absolutejs/research/aggregate-free-transport');
const sources=[import.meta.path,resolve('../rapier-rigid-reference/absolutejs/research/rigid-midpoint/rk4.ts'),resolve('../rapier-rigid-reference/absolutejs/research/rigid-midpoint/reference.ts'),resolve(directory,'trajectory-inputs.log')];
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(sources.map(p=>[p,hash(p)]));
const input=readFileSync(resolve(directory,'trajectory-inputs.log'),'utf8');
const matches=[...input.matchAll(/AGGREGATE_TRAJECTORY_INPUT root=(\d+) principal=(\[[^\n]+?\]) frame=(\[[^\n]+?\]) rotation=(\[[^\n]+?\]) omega=(\[[^\n]+?\])/g)];
if(matches.length!==3)throw Error('Expected three native input fixtures');
const conjugate=(q:Q):Q=>[-q[0],-q[1],-q[2],q[3]];
let maximumRefinementAngle=0,maximumRefinementMomentum=0;const rows:number[][]=[];
for(const m of matches){
 // Rust's f32 Debug representation roundtrips through f32, not directly f64.
 const principal=(JSON.parse(m[2]!) as number[]).map(Math.fround) as V;
 const frame=(JSON.parse(m[3]!) as number[]).map(Math.fround) as Q;
 const rotation=(JSON.parse(m[4]!) as number[]).map(Math.fround) as Q;
 const omega=(JSON.parse(m[5]!) as number[]).map(Math.fround) as V;
 const q=normalize(multiply(normalize(rotation),normalize(frame)));
 const local=rotate(conjugate(q),omega);
 const initial:State={rotation:q,momentum:local.map((w,i)=>w*principal[i]!) as V};
 const inverse:M=[1/principal[0],0,0,0,1/principal[1],0,0,0,1/principal[2]];
 for(const hz of [60,120,240]){
  const duration=Math.fround(1/hz)*hz;
  const integrate=(steps:number)=>{let state=structuredClone(initial);for(let i=0;i<steps;i++)state=rk4Step(state,inverse,duration/steps);return state;};
  const coarse=integrate(7680),fine=integrate(15360);
  maximumRefinementAngle=Math.max(maximumRefinementAngle,rotationDistance(coarse.rotation,fine.rotation));
  maximumRefinementMomentum=Math.max(maximumRefinementMomentum,Math.hypot(...coarse.momentum.map((v,i)=>v-fine.momentum[i]!)));
  const expected=normalize(multiply(fine.rotation,conjugate(normalize(frame))));
  rows.push([Number(m[1]),hz,...principal,...frame,...rotation,...omega,...expected]);
 }
}
if(maximumRefinementAngle>1e-10||maximumRefinementMomentum>1e-9)throw Error('RK4 reference did not refine');
for(const p of sources)if(hash(p)!==hashes[p])throw Error('Reference source changed during generation');
const output=resolve(directory,'trajectory-reference.txt');
writeFileSync(output,rows.map(row=>row.map(v=>v.toPrecision(17)).join(',')).join('\n')+'\n');
const receipt={scope:'Independent RK4 reference for native stored aggregate moments; actual f32 timestep duration; 7680 versus 15360 steps',cases:rows.length,maximumRefinementAngle,maximumRefinementMomentum,hashes,fixtureSha256:hash(output)};
writeFileSync(resolve(directory,'trajectory-reference-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(receipt);
