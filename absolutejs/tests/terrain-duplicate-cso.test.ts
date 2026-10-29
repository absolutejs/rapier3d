import {beforeAll,expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import R from '../../dist/rapier.mjs';
beforeAll(async()=>{await R.init();});
test('cached terrain approach keeps contact before the tree crosses the floor',()=>{
 const bytes=readFileSync(new URL('./fixtures/terrain-duplicate-cso-before.bin',import.meta.url));
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('129f41ae042258d91863f4deac7a8e9c2187f77f15681930c8f24320d9f26607');
 const w=R.World.restoreSnapshot(bytes),replay=R.World.restoreSnapshot(bytes);
 try{
  expect(w.takeSnapshot()).toEqual(new Uint8Array(bytes));
  for(let step=877;step<=880;step++){
   w.step();replay.step();expect(replay.takeSnapshot()).toEqual(w.takeSnapshot());
   const before=w.takeSnapshot(),distances:number[]=[];
   w.contactPair(w.getCollider(0),w.getCollider(Number.MIN_VALUE),m=>{
    if(m.subshape1()===999)for(let i=0;i<m.numContacts();i++)distances.push(m.contactDist(i));
   });
   expect(w.takeSnapshot()).toEqual(before);
   expect(distances.length).toBeGreaterThan(0);
   expect(distances.every(Number.isFinite)).toBe(true);
   // Native units are centimetres. Initial independent fixture separation
   // is approximately 0.01 cm; allow projection roundoff, not deep overlap.
   expect(Math.min(...distances)).toBeGreaterThanOrEqual(-0.003);
   if(step===877)expect(Math.min(...distances)).toBeCloseTo(0.01,2);
  }
 }finally{replay.free();w.free();}
});
