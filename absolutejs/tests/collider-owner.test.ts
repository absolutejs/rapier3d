import { beforeAll, expect, test } from 'bun:test';
import R from '../../dist/rapier.mjs';
beforeAll(async()=>{await R.init();});
test('snapshot restore preserves null collider owners and real body zero',()=>{
 const initial=new R.World({x:0,y:-9.81,z:0});
 const floor=initial.createCollider(R.ColliderDesc.cuboid(5,1,5));
 const first=initial.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,3,0));
 const moving=initial.createCollider(R.ColliderDesc.ball(1),first);
 const fixed=initial.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(10,0,0));
 const anchored=initial.createCollider(R.ColliderDesc.ball(1),fixed);
 const handles={floor:floor.handle,moving:moving.handle,anchored:anchored.handle,first:first.handle,fixed:fixed.handle};
 let world=initial;
 try {
  expect(handles.first).toBe(0);
  for(let round=0;round<3;round++) {
   expect(world.getCollider(handles.floor).parent()).toBeNull();
   expect(world.getCollider(handles.moving).parent()?.handle).toBe(handles.first);
   expect(world.getCollider(handles.anchored).parent()?.handle).toBe(handles.fixed);
   expect(world.getRigidBody(handles.first).numColliders()).toBe(1);
   expect(world.getRigidBody(handles.fixed).numColliders()).toBe(1);
   if(round<2){const next=R.World.restoreSnapshot(world.takeSnapshot());world.free();world=next;}
  }
 }finally{world.free();}
});
