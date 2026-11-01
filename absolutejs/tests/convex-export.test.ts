import {beforeAll,expect,test} from 'bun:test';
import R from '../../dist/rapier.mjs';
import fixture from './fixtures/captured-convex-exports.json';
import slender from './fixtures/slender-convex-exports.json';
beforeAll(async()=>{await R.init();});
import {certifyConvexBoundary as certify} from './convex-export-certificate';
test('exact test predicate distinguishes thin outward and reversed planes',()=>{
 const p=Float32Array.from([0,0,0,1,0,0,0,1,0,0,0,2**-30]);
 const i=Uint32Array.from([1,2,3,0,2,1,0,1,3,0,3,2]);
 certify(p,i,Array.from(p));
 const wrong=i.slice();[wrong[1],wrong[2]]=[wrong[2]!,wrong[1]!];
 expect(()=>certify(p,wrong,Array.from(p))).toThrow();
});
for(const [member,f]of [...fixture.members,...slender.members].entries())test(`convex export ${member} is a closed outward boundary of unchanged stored points`,()=>{
 const world=new R.World({x:0,y:0,z:0});
 try{
  const desc=f.inputIndices?R.ColliderDesc.convexMesh(Float32Array.from(f.inputPositions),Uint32Array.from(f.inputIndices)):R.ColliderDesc.convexHull(Float32Array.from(f.inputPositions));
  expect(desc).not.toBeNull();const collider=world.createCollider(desc!.setDensity(0));
  const before=world.takeSnapshot(),mass=collider.mass();
  const atomic=collider.convexMeshData();expect(atomic).toBeDefined();
  const p=atomic!.vertices,i=atomic!.indices;
  expect(collider.vertices()).toEqual(p);expect(collider.indices()).toEqual(i);
  certify(p,i,f.positions);
  const original=new Set(Array.from({length:f.inputPositions.length/3},(_,j)=>f.inputPositions.slice(j*3,j*3+3).join(',')));
  for(let j=0;j<p.length;j+=3)expect(original.has(Array.from(p.subarray(j,j+3)).join(','))).toBe(true);
  expect(collider.mass()).toBe(mass);expect(world.takeSnapshot()).toEqual(before);
  expect(collider.vertices()).toEqual(p);expect(collider.indices()).toEqual(i);
 }finally{world.free();}
});
test('atomic convex buffers are owned and follow shape replacement',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const points=Float32Array.from([0,0,0,1,0,0,0,1,0,0,0,1]);
  const c=w.createCollider(R.ColliderDesc.convexHull(points)!);const first=c.convexMeshData()!,before=w.takeSnapshot();
  first.vertices.fill(123);first.indices.fill(0);
  const next=c.convexMeshData()!;certify(next.vertices,next.indices,Array.from(points));expect(w.takeSnapshot()).toEqual(before);
  const larger=Float32Array.from(points,v=>v*2);c.setShape(R.ColliderDesc.convexHull(larger)!.shape);
  const changed=c.convexMeshData()!;certify(changed.vertices,changed.indices,Array.from(larger));expect(Math.max(...changed.vertices)).toBe(2);
 }finally{w.free();}
});
test('atomic convex export distinguishes nonconvex and rounded core boundaries',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const ball=w.createCollider(R.ColliderDesc.ball(1));expect(ball.convexMeshData()).toBeUndefined();
  const points=Float32Array.from([0,0,0,1,0,0,0,1,0,0,0,1]);const rounded=w.createCollider(R.ColliderDesc.roundConvexHull(points,.2)!);
  const mesh=rounded.convexMeshData()!;certify(mesh.vertices,mesh.indices,Array.from(points));expect(Math.max(...mesh.vertices)).toBe(1);
 }finally{w.free();}
});
