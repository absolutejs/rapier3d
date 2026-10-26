import {beforeAll,expect,test} from 'bun:test';
import R from '../../dist/rapier.mjs';
import {fixture} from './fixture';
beforeAll(async()=>{await R.init();});
test('CCD counter distinguishes unavailable, inactive and fresh profiled steps',()=>{
 const world=new R.World({x:0,y:0,z:0}),events=new R.EventQueue(true);
 try {
  expect(world.profilerEnabled).toBe(false);expect(world.ccdSubsteps()).toBeNull();
  world.step();expect(world.ccdSubsteps()).toBeNull();
  world.profilerEnabled=true;expect(world.ccdSubsteps()).toBeNull();
  world.step();expect(world.ccdSubsteps()).toBe(0);
  world.profilerEnabled=true;expect(world.ccdSubsteps()).toBe(0);
  world.profilerEnabled=false;expect(world.ccdSubsteps()).toBeNull();
  world.profilerEnabled=true;expect(world.ccdSubsteps()).toBeNull();
  world.step(events);expect(world.ccdSubsteps()).toBe(0);
  const restored=R.World.restoreSnapshot(world.takeSnapshot());
  try {expect(restored.ccdSubsteps()).toBeNull();expect(restored.profilerEnabled).toBe(false);}finally{restored.free();}
 }finally{events.free();world.free();}
});
test('profiled CCD counts preserve every fixture pose with and without event collection',()=>{
 const measured=fixture(R),control=fixture(R),events=new R.EventQueue(true);
 let maximum=0;
 try {
  measured.w.profilerEnabled=true;
  for(let step=0;step<650;step++) {
   measured.w.step(step%2?events:undefined);control.w.step();
   const count=measured.w.ccdSubsteps();expect(count).not.toBeNull();
   expect(Number.isInteger(count)).toBe(true);expect(count!).toBeGreaterThanOrEqual(0);expect(count!).toBeLessThanOrEqual(4);
   maximum=Math.max(maximum,count!);
   expect(control.w.ccdSubsteps()).toBeNull();
   for(let i=0;i<2;i++) {expect(measured.bodies[i]!.translation()).toEqual(control.bodies[i]!.translation());expect(measured.bodies[i]!.rotation()).toEqual(control.bodies[i]!.rotation());}
  }
  expect(maximum).toBeGreaterThan(0);
  measured.w.profilerEnabled=false;expect(measured.w.ccdSubsteps()).toBeNull();
  measured.w.profilerEnabled=true;expect(measured.w.ccdSubsteps()).toBeNull();
 }finally{events.free();measured.w.free();control.w.free();}
},15000);

test('CCD reports actual subdivision and resets after an inactive step',()=>{
 for(const cap of [1,4]) {
  const world=new R.World({x:0,y:0,z:0}),events=new R.EventQueue(true);
  try {
   world.timestep=1/60;world.integrationParameters.maxCcdSubsteps=cap;world.profilerEnabled=true;
   world.createCollider(R.ColliderDesc.cuboid(.01,2,2));
   const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-1,0,0).setLinvel(120,0,0).setCcdEnabled(true));
   world.createCollider(R.ColliderDesc.ball(.1),body);
   world.step(events);expect(world.ccdSubsteps()).toBe(cap===1?1:2);
   body.setTranslation({x:-2,y:0,z:0},true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
   world.step();expect(world.ccdSubsteps()).toBe(0);
  }finally{events.free();world.free();}
 }
});
