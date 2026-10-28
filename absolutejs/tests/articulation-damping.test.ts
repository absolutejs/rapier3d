import { beforeAll, expect, test } from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
const q={x:0,y:0,z:0,w:1};
function fixture(world:R.World,offset=0){
 const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(offset,0,0).setCanSleep(false).setAngularDamping(0));
 const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(offset+1,0,0).setCanSleep(false).setAngularDamping(0));
 for(const body of [a,b])world.createCollider(R.ColliderDesc.ball(.25).setMass(1).setCollisionGroups(0),body);
 const joint=world.createMultibodyJoint(R.JointData.fixed({x:1,y:0,z:0},q,{x:0,y:0,z:0},q),a,b,true);
 return {a,b,joint};
}
test('generalized damping exposes root defaults as an owned read-only copy',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const {joint}=fixture(w),s=w.takeSnapshot();const values=w.multibodyJoints.generalizedDamping(joint.handle)!;
  expect([...values]).toEqual([0,0,0,Math.fround(.1),Math.fround(.1),Math.fround(.1)]);
  values.fill(7);expect([...w.multibodyJoints.generalizedDamping(joint.handle)!]).not.toEqual([...values]);
  expect(w.takeSnapshot()).toEqual(s);
 }finally{w.free();}
});
test('damping writes are transactional including native bypass, overflow and stale handles',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const {joint}=fixture(w);const s=w.takeSnapshot();
  for(const values of [[0],Array(6).fill(-1),Array(6).fill(NaN),Array(6).fill(Infinity),Array(6).fill(1e100)]){
   expect(w.multibodyJoints.setGeneralizedDamping(joint.handle,values)).toBe(false);expect(w.takeSnapshot()).toEqual(s);
  }
  for(const values of [new Float32Array(1),Float32Array.from([0,0,0,-1,0,0]),Float32Array.from([0,0,0,NaN,0,0])]){
   expect(w.multibodyJoints.raw.setGeneralizedDamping(joint.handle,values)).toBe(false);expect(w.takeSnapshot()).toEqual(s);
  }
  w.removeMultibodyJoint(joint,true);const removed=w.takeSnapshot();
  expect(w.multibodyJoints.generalizedDamping(joint.handle)).toBeUndefined();
  expect(w.multibodyJoints.setGeneralizedDamping(joint.handle,new Float32Array(6))).toBe(false);
  expect(w.takeSnapshot()).toEqual(removed);
 }finally{w.free();}
});
test('explicit damping survives snapshot restoration and does not affect another articulation',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const a=fixture(w),b=fixture(w,10);const values=Float32Array.from([.2,.3,.4,0,0,0]);
  expect(w.multibodyJoints.setGeneralizedDamping(a.joint.handle,values)).toBe(true);values.fill(99);
  const restored=R.World.restoreSnapshot(w.takeSnapshot());try{
   expect([...restored.multibodyJoints.generalizedDamping(a.joint.handle)!]).toEqual([Math.fround(.2),Math.fround(.3),Math.fround(.4),0,0,0]);
   expect(restored.multibodyJoints.generalizedDamping(b.joint.handle)![5]).toBe(Math.fround(.1));
   for(let i=0;i<8;i++){w.step();restored.step();expect(restored.takeSnapshot()).toEqual(w.takeSnapshot());}
  }finally{restored.free();}
 }finally{w.free();}
});
test('articulation topology changes require a freshly sized damping vector',()=>{
 const w=new R.World({x:0,y:0,z:0});try{
  const {a,b,joint}=fixture(w);const old=w.multibodyJoints.generalizedDamping(joint.handle)!;
  const c=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(2,0,0));w.createCollider(R.ColliderDesc.ball(.25).setMass(1),c);
  const other=w.createMultibodyJoint(R.JointData.revolute({x:1,y:0,z:0},{x:0,y:0,z:0},{x:0,y:0,z:1}),b,c,true);
  expect(w.multibodyJoints.generalizedDamping(joint.handle)!.length).toBe(7);
  expect(w.multibodyJoints.setGeneralizedDamping(joint.handle,old)).toBe(false);
  expect(w.multibodyJoints.setGeneralizedDamping(other.handle,new Float32Array(7))).toBe(true);
  expect([...w.multibodyJoints.generalizedDamping(joint.handle)!]).toEqual(Array(7).fill(0));
 }finally{w.free();}
});
