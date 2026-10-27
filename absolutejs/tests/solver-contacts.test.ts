import { beforeAll, expect, test } from 'bun:test';
import R from '../../dist/rapier.mjs';
import upstream from '@dimforge/rapier3d-compat';
beforeAll(async()=>{await Promise.all([R.init(),R.init(),upstream.init()]);});
import { fixture } from './fixture';
test('clustered solver contacts are exposed separately from original geometry',()=>{
 const {w,a,b}=fixture(R);
 try {
  let geometric=0, originalSolver=0, actualSolver=0;
  for(let i=0;i<800;i++) {
   w.step();
   w.contactPair(a,b,m=>{geometric+=m.numContacts();originalSolver+=m.numSolverContacts();});
   w.solverContactPair(a,b,m=>{actualSolver+=m.numSolverContacts();for(let j=0;j<m.numSolverContacts();j++){expect(Number.isFinite(m.solverContactDist(j))).toBe(true);expect(m.solverContactPoint(j)).not.toBeNull();}});
  }
  expect(geometric).toBeGreaterThan(0);expect(originalSolver).toBe(0);expect(actualSolver).toBeGreaterThan(0);
 }finally{w.free();}
});
test('query is reentrant, preserves argument flipping, and frees views after throws',()=>{
 const {w,a,b}=fixture(R);try {
  for(let i=0;i<650;i++)w.step();
  const read=(x:any,y:any)=>{const rows:any[]=[];w.solverContactPair(x,y,(m:any,flipped:boolean)=>rows.push({flipped,count:m.numSolverContacts(),normal:m.normal()}));return rows;};
  const forward=read(a,b),reverse=read(b,a);expect(forward.length).toBeGreaterThan(0);expect(reverse.length).toBe(forward.length);expect(reverse[0].flipped).toBe(!forward[0].flipped);
  let nested=0;w.solverContactPair(a,b,m=>{const n=m.numSolverContacts();nested+=read(a,b).length;expect(m.numSolverContacts()).toBe(n);});expect(nested).toBeGreaterThan(0);
  expect(()=>w.solverContactPair(a,b,()=>{throw Error('callback sentinel');})).toThrow('callback sentinel');expect(read(a,b)).toEqual(forward);
 }finally{w.free();}
});
for(const hz of [960,1920])for(const tilt of [0,.3]) test(`dynamic-only fixtures preserve upstream motion ${hz}Hz tilt=${tilt}`,()=>{
 const started=performance.now();
 const a=fixture(R,hz,tilt),b=fixture(upstream,hz,tilt);try{
  for(let i=0;i<2*hz;i++) {if(i%120===0&&performance.now()-started>10000)throw Error("Parity fixture exceeded 10s CPU-work wall budget");a.w.step();b.w.step();a.w.solverContactPair(a.a,a.b,()=>{});
   if(i%120===0) for(let k=0;k<2;k++) {expect(a.bodies[k]!.translation()).toEqual(b.bodies[k]!.translation());expect(a.bodies[k]!.rotation()).toEqual(b.bodies[k]!.rotation());expect(a.bodies[k]!.linvel()).toEqual(b.bodies[k]!.linvel());}
  }
 }finally{a.w.free();b.w.free();}
},15000);
