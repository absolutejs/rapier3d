import { beforeAll, expect, test } from 'bun:test';
import R from '../../dist/rapier.mjs';
import { fixture } from './fixture';
beforeAll(async()=>{await R.init();});
const read=(w:any,a:any,b:any)=>{const rows:any[]=[];w.solverContactPair(a,b,(m:any)=>{
 for(let i=0;i<m.numSolverContacts();i++)rows.push({normal:m.normal(),first:m.solverContactPoint1(i),second:m.solverContactPoint2(i),midpoint:m.solverContactPoint(i),cached:m.solverContactDist(i),live:m.solverContactSeparation(i)});
 for(const invalid of [100000,-1,NaN,Infinity,1.5,2**32]){const target={x:7,y:8,z:9};expect(m.solverContactPoint1(invalid,target)).toBeNull();expect(target).toEqual({x:7,y:8,z:9});expect(m.solverContactPoint2(invalid)).toBeNull();expect(m.solverContactSeparation(invalid)).toBeNull();}
});return rows;};
test('live anchors reconstruct solver midpoint and signed normal separation',()=>{
 const {w,a,b}=fixture(R);try{
  for(let i=0;i<650;i++)w.step();
  const rows=read(w,a,b);expect(rows.length).toBeGreaterThan(0);
  for(const r of rows){
   expect(r.first).not.toBeNull();expect(r.second).not.toBeNull();expect(Number.isFinite(r.live)).toBe(true);
   const dot=(r.second.x-r.first.x)*r.normal.x+(r.second.y-r.first.y)*r.normal.y+(r.second.z-r.first.z)*r.normal.z;
   expect(Math.abs(dot-r.live)).toBeLessThan(1e-5);
   for(const k of ['x','y','z'])expect(Math.abs((r.first[k]+r.second[k])/2-r.midpoint[k])).toBeLessThan(1e-5);
  }
 }finally{w.free();}
});
test('live separation follows pose changes while cached distance stays fixed',()=>{
 const {w,a,b,bodies}=fixture(R);try{
  for(let i=0;i<650;i++)w.step();
  const before=read(w,a,b);const p=bodies[0].translation();
  bodies[0].setTranslation({x:p.x,y:p.y+.1,z:p.z},true);
  const after=read(w,a,b);expect(after.length).toBe(before.length);
  expect(after.map(r=>r.cached)).toEqual(before.map(r=>r.cached));
  expect(after.some((r,i)=>Math.abs(r.live-before[i].live)>.05)).toBe(true);
 }finally{w.free();}
});
test('clustering defaults stay upstream-compatible and explicit opt-out survives snapshots',()=>{
 const {w,a,b}=fixture(R);let restored:any;try{
  expect(w.integrationParameters.contactClustering).toBe(true);
  expect(w.integrationParameters.minCcdDt).toBeCloseTo(1/60/100,9);
  for(const value of [-1,NaN,Infinity,Number.MAX_VALUE])expect(()=>{w.integrationParameters.minCcdDt=value;}).toThrow(RangeError);
  w.integrationParameters.minCcdDt=1/960/100;
  expect(()=>{w.integrationParameters.contactClustering='false' as any;}).toThrow(TypeError);
  w.integrationParameters.contactClustering=false;
  for(let i=0;i<650;i++)w.step();
  let original=0,solver=0;
  w.contactPair(a,b,m=>{original+=m.numSolverContacts();});
  w.solverContactPair(a,b,m=>{solver+=m.numSolverContacts();});
  expect(original).toBeGreaterThan(0);expect(solver).toBe(original);
  restored=R.World.restoreSnapshot(w.takeSnapshot());expect(restored.integrationParameters.contactClustering).toBe(false);
  expect(restored.integrationParameters.minCcdDt).toBeCloseTo(1/960/100,10);
 }finally{restored?.free();w.free();}
});
