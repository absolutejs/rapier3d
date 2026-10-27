import {beforeAll,expect,test} from 'bun:test';
import R from '../../dist/rapier.mjs';
beforeAll(async()=>{await R.init();});
test('current-body query observes unpropagated edits without changing the world',()=>{
 const w=new R.World({x:0,y:0,z:0});
 try {
  const fixed=w.createCollider(R.ColliderDesc.ball(1));
  const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,1.8,0));
  const moving=w.createCollider(R.ColliderDesc.ball(1),b);
  expect(fixed.contactCollider(moving,0)!.distance).toBeCloseTo(-.2,5);
  b.setTranslation({x:0,y:3,z:0},true);
  const before=w.takeSnapshot();
  expect(fixed.contactCollider(moving,0)!.distance).toBeCloseTo(-.2,5);
  expect(fixed.contactColliderAtCurrentBodyPoses(moving)).toBeNull();
  const predicted=fixed.contactColliderAtCurrentBodyPoses(moving,1.1)!;
  expect(predicted.distance).toBeCloseTo(1,5);
  expect(w.takeSnapshot()).toEqual(before);
  expect(moving.translation().y).toBeCloseTo(1.8,5);
  const control=R.World.restoreSnapshot(before);
  try {w.step();control.step();expect(w.takeSnapshot()).toEqual(control.takeSnapshot());}finally{control.free();}
 }finally{w.free();}
});
test('current-body query composes noncommuting parent and child rotations',()=>{
 const w=new R.World({x:0,y:0,z:0});
 try {
  const b=w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(2,3,4));
  const platform=w.createCollider(R.ColliderDesc.cuboid(2,.05,.5).setTranslation(0,1,0).setRotation({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2}),b);
  const sphere=w.createCollider(R.ColliderDesc.ball(.1).setTranslation(1.87,3,5));
  // Parent X rotation followed by local Z rotation: local face Y points along -X.
  b.setRotation({x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2},true);
  const before=w.takeSnapshot();
  const hit=platform.contactColliderAtCurrentBodyPoses(sphere)!;
  expect(hit.distance).toBeCloseTo(-.02,5);
  expect(hit.normal1.x).toBeCloseTo(-1,5);
  expect(hit.normal1.y).toBeCloseTo(0,5);
  expect(hit.normal1.z).toBeCloseTo(0,5);
  const reversed=sphere.contactColliderAtCurrentBodyPoses(platform)!;
  expect(reversed.distance).toBeCloseTo(hit.distance,5);
  expect(reversed.normal1.x).toBeCloseTo(1,5);
  expect(w.takeSnapshot()).toEqual(before);
  const restored=R.World.restoreSnapshot(before);
  try {expect(restored.getCollider(platform.handle).contactColliderAtCurrentBodyPoses(restored.getCollider(sphere.handle))!.distance).toBeCloseTo(-.02,5);}finally{restored.free();}
 }finally{w.free();}
});
test('fresh shape results are owned, reusable, and prediction is validated',()=>{
 const w=new R.World({x:0,y:0,z:0});
 try {
  const a=w.createCollider(R.ColliderDesc.ball(1)),b=w.createCollider(R.ColliderDesc.ball(1).setTranslation(1.5,0,0));
  const hit=a.contactColliderAtCurrentBodyPoses(b)!;hit.distance=999;hit.normal1.x=99;
  const next=a.contactColliderAtCurrentBodyPoses(b)!;expect(next.distance).toBeCloseTo(-.5,6);expect(next.normal1.x).toBeCloseTo(1,6);
  expect(a.contactColliderAtCurrentBodyPoses(b,0,hit)).toBe(hit);expect(hit.distance).toBeCloseTo(-.5,6);
  for(const invalid of [NaN,Infinity,-Infinity,-1])expect(()=>a.contactColliderAtCurrentBodyPoses(b,invalid)).toThrow(RangeError);
  w.removeCollider(b,true);expect(()=>a.contactColliderAtCurrentBodyPoses(b)).toThrow('valid colliders');
 }finally{w.free();}
});
