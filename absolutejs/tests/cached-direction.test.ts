import {beforeAll,expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import R from '../../dist/rapier.mjs';
beforeAll(async()=>{await R.init();});
test('cached triangle direction cannot invent deep oak penetration',()=>{
 const bytes=readFileSync(new URL('./fixtures/oak-cached-direction-before.bin',import.meta.url));
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('a3e13459a656bc3436c91452f96a2c30e76232e5757c06d8dd09e2decc1bff53');
 const w=R.World.restoreSnapshot(bytes),replay=R.World.restoreSnapshot(bytes);
 try {
  expect(w.takeSnapshot()).toEqual(new Uint8Array(bytes));
  w.step();replay.step();expect(replay.takeSnapshot()).toEqual(w.takeSnapshot());
  const floor=w.getCollider(0),wood=w.getCollider(5e-323);
  const distances:number[]=[];
  w.contactPair(floor,wood,m=>{
   if(m.subshape1()===6111)for(let i=0;i<m.numContacts();i++)distances.push(m.contactDist(i));
  });
  expect(distances.length).toBeGreaterThan(0);
  expect(distances.every(Number.isFinite)).toBe(true);
  // Independent pre-step plane bound is 0.001265 cm. This fixture assertion
  // allows f32 projection error; it changes no simulation tolerance.
  expect(Math.min(...distances)).toBeGreaterThanOrEqual(-0.003);
 }finally{replay.free();w.free();}
});
