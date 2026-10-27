import {beforeAll,expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import R from '../../dist/rapier.mjs';
beforeAll(async()=>{await R.init();});
test('tetrahedron reduction does not invent deep penetration in a separated floor/hull pair',()=>{
 const bytes=readFileSync(new URL('./fixtures/simplex-floor-hull-before.bin',import.meta.url));
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('c865ce89eaec5ddd19ea2a32884cf0b4e744cb5b856969535b705d473b7fe195');
 const w=R.World.restoreSnapshot(bytes);
 try {
  const floor=w.getCollider(0),wood=w.getCollider(2e-323);
  expect(floor.shapeType()).toBe(R.ShapeType.Cuboid);
  expect(wood.vertices().length).toBe(42);
  w.step();
  const distances:number[]=[];
  w.contactPair(floor,wood,m=>{
   for(let i=0;i<m.numContacts();i++)distances.push(m.contactDist(i));
  });
  expect(distances.length).toBeGreaterThan(0);
  expect(distances.every(Number.isFinite)).toBe(true);
  // Native coordinates are centimetres. The old query reported -14.719921 cm
  // while the hull was separated. Allow 0.1 mm numerical contact tolerance.
  expect(Math.min(...distances)).toBeGreaterThan(-0.01);
  const fresh=floor.contactColliderAtCurrentBodyPoses(wood,2);
  expect(fresh).not.toBeNull();
  expect(fresh!.distance).toBeGreaterThan(-0.01);
 }finally{w.free();}
});
