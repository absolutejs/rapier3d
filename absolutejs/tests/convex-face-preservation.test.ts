import { beforeAll, expect, test } from 'bun:test';
import R from '@absolutejs/rapier3d';
import rock from './fixtures/convex-stone-mass.json';
beforeAll(async()=>{await R.init();});
const indices=Uint32Array.from([0,1,2,0,2,3,0,4,5,0,5,1,1,5,6,1,6,2,3,2,6,3,6,7,0,3,7,0,7,4,4,8,5,5,8,6,6,8,7,7,8,4]);
const points=(height:number,scale:number)=>Float32Array.from([-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,1,-1,1,-1,1,1,-1,1,1,1,-1,1,1,0,1+height,0],v=>v*scale);
for(const scale of [0.001,1,100,10000])test(`convex mesh retains shallow ridge mass and ray surface at scale ${scale}`,()=>{
 const world=new R.World({x:0,y:0,z:0});try{
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic());
  const collider=world.createCollider(R.ColliderDesc.convexMesh(points(.01,scale),indices)!.setDensity(1/scale**3),body);
  expect(Math.abs(body.mass()-(8+4*.01/3))/(8+4*.01/3)).toBeLessThan(2e-6);
  const hit=collider.castRayAndGetNormal(new R.Ray({x:.25*scale,y:3*scale,z:0},{x:0,y:-1,z:0}),5*scale,false);
  expect(hit).not.toBeNull();expect(Math.abs((3*scale-hit!.timeOfImpact)/scale-1.0075)).toBeLessThan(2e-6);
 }finally{world.free();}
});
test('captured stone mass matches its exact rendered boundary',()=>{
 const world=new R.World({x:0,y:0,z:0});try{
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic());world.createCollider(R.ColliderDesc.convexMesh(Float32Array.from(rock.positions),Uint32Array.from(rock.indices))!.setDensity(rock.density),body);
  expect(Math.abs(body.mass()-rock.expectedMass)/rock.expectedMass).toBeLessThan(2e-6);
 }finally{world.free();}
});
test('coplanar cube retains its mass and exact snapshot restoration',()=>{
 const world=new R.World({x:0,y:0,z:0});let restored:R.World|undefined;try{
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic());world.createCollider(R.ColliderDesc.convexMesh(points(0,1),indices)!.setDensity(1),body);expect(body.mass()).toBeCloseTo(8,5);
  const snapshot=world.takeSnapshot();restored=R.World.restoreSnapshot(snapshot);expect(restored.takeSnapshot()).toEqual(snapshot);
 }finally{restored?.free();world.free();}
});
