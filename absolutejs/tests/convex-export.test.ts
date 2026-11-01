import {beforeAll,expect,test} from 'bun:test';
import R from '../../dist/rapier.mjs';
import fixture from './fixtures/captured-convex-exports.json';
beforeAll(async()=>{await R.init();});
import {certifyConvexBoundary as certify} from './convex-export-certificate';
test('exact test predicate distinguishes thin outward and reversed planes',()=>{
 const p=Float32Array.from([0,0,0,1,0,0,0,1,0,0,0,2**-30]);
 const i=Uint32Array.from([1,2,3,0,2,1,0,1,3,0,3,2]);
 certify(p,i,Array.from(p));
 const wrong=i.slice();[wrong[1],wrong[2]]=[wrong[2]!,wrong[1]!];
 expect(()=>certify(p,wrong,Array.from(p))).toThrow();
});
for(const [member,f]of fixture.members.entries())test(`convex export ${member} is a closed outward boundary of unchanged stored points`,()=>{
 const world=new R.World({x:0,y:0,z:0});
 try{
  const desc=f.inputIndices?R.ColliderDesc.convexMesh(Float32Array.from(f.inputPositions),Uint32Array.from(f.inputIndices)):R.ColliderDesc.convexHull(Float32Array.from(f.inputPositions));
  expect(desc).not.toBeNull();const collider=world.createCollider(desc!.setDensity(0));
  const before=world.takeSnapshot(),mass=collider.mass();
  const p=collider.vertices()!,i=collider.indices()!;
  certify(p,i,f.positions);
  const original=new Set(Array.from({length:f.inputPositions.length/3},(_,j)=>f.inputPositions.slice(j*3,j*3+3).join(',')));
  for(let j=0;j<p.length;j+=3)expect(original.has(Array.from(p.subarray(j,j+3)).join(','))).toBe(true);
  expect(collider.mass()).toBe(mass);expect(world.takeSnapshot()).toEqual(before);
  expect(collider.vertices()).toEqual(p);expect(collider.indices()).toEqual(i);
 }finally{world.free();}
});
