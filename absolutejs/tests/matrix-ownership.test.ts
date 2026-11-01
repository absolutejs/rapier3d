import {beforeAll,expect,test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
function fixture(){
 const world=new R.World({x:0,y:0,z:0});
 const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation({x:0,y:Math.sin(.3),z:0,w:Math.cos(.3)}));
 world.createCollider(R.ColliderDesc.cuboid(.4,.2,.1).setDensity(100),body);
 body.recomputeMassPropertiesFromColliders();body.setLinvel({x:12,y:23,z:34},true);body.setAngvel({x:.2,y:.3,z:.4},true);
 return {world,body};
}
test('returned inertia matrices own their six elements across unrelated native getters',()=>{
 const {world,body}=fixture();
 try{
  const inverse=body.effectiveWorldInvInertia(),saved=Array.from(inverse.elements);
  body.linvel();body.angvel();body.velocityAtPoint({x:3,y:2,z:1});body.worldCom();body.effectiveInvMass();
  expect(Array.from(inverse.elements)).toEqual(saved);
  expect(inverse.elements.length).toBe(6);
  const inertia=body.effectiveAngularInertia(),savedInertia=Array.from(inertia.elements);
  const other=body.effectiveWorldInvInertia();body.rotation();body.translation();
  expect(Array.from(inverse.elements)).toEqual(saved);
  expect(Array.from(inertia.elements)).toEqual(savedInertia);
  expect(other.elements.buffer).not.toBe(inverse.elements.buffer);
  inverse.elements.fill(0);
  expect(Array.from(body.effectiveWorldInvInertia().elements)).toEqual(saved);
  expect(Array.from(inertia.elements)).toEqual(savedInertia);
 }finally{world.free();}
});
test('an explicit matrix target is reused and stays unchanged until explicitly filled again',()=>{
 const {world,body}=fixture();
 try{
  const target=new R.SdpMatrix3(new Float32Array(6));
  expect(body.effectiveWorldInvInertia(target)).toBe(target);
  const saved=Array.from(target.elements);
  body.linvel();body.angvel();body.effectiveAngularInertia();
  expect(Array.from(target.elements)).toEqual(saved);
  expect(body.effectiveAngularInertia(target)).toBe(target);
  expect(Array.from(target.elements)).not.toEqual(saved);
 }finally{world.free();}
});
