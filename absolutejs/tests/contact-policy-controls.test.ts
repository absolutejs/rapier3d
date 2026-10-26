import { beforeAll, expect, test } from 'bun:test';
import R from '../../dist/rapier.mjs';
beforeAll(async()=>{await R.init();});

test('contact policy controls preserve defaults and survive native snapshots',()=>{
 const w=new R.World({x:0,y:-9.81,z:0});
 try {
  const p=w.integrationParameters;
  expect(p.contactRecycling).toBe(true);
  expect(p.normalizedContactRecycleDistance).toBeCloseTo(.05,7);
  expect(p.warmstartCoefficient).toBe(1);
  p.contactRecycling=false;p.normalizedContactRecycleDistance=.001;p.warmstartCoefficient=.5;
  const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,2,0));w.createCollider(R.ColliderDesc.ball(.1),b);
  w.step();const restored=R.World.restoreSnapshot(w.takeSnapshot());
  try {
   expect(restored.integrationParameters.contactRecycling).toBe(false);
   expect(restored.integrationParameters.normalizedContactRecycleDistance).toBeCloseTo(.001,8);
   expect(restored.integrationParameters.warmstartCoefficient).toBe(.5);
   for(let i=0;i<8;i++){w.step();restored.step();expect(restored.getRigidBody(b.handle).translation()).toEqual(b.translation());}
  }finally{restored.free();}
 }finally{w.free();}
});

test('invalid contact policy values fail before mutating native state',()=>{
 const p=new R.IntegrationParameters();
 try {
  for(const value of [NaN,Infinity,-Infinity,-1,1e100]){
   expect(()=>{p.normalizedContactRecycleDistance=value;}).toThrow(RangeError);
   expect(p.normalizedContactRecycleDistance).toBeCloseTo(.05,7);
  }
  for(const value of [NaN,Infinity,-Infinity,-.01,1.01]){
   expect(()=>{p.warmstartCoefficient=value;}).toThrow(RangeError);
   expect(p.warmstartCoefficient).toBe(1);
  }
  for(const value of [0,1,'false',null,undefined]){
   expect(()=>{p.contactRecycling=value as unknown as boolean;}).toThrow(TypeError);
   expect(p.contactRecycling).toBe(true);
  }
  p.normalizedContactRecycleDistance=0;p.warmstartCoefficient=0;
  expect(p.normalizedContactRecycleDistance).toBe(0);expect(p.warmstartCoefficient).toBe(0);
 }finally{p.free();}
});

for(const recycling of [true,false])for(const warmstart of [0,1])
test(`explicit policy still resolves solid floor contacts recycling=${recycling} warmstart=${warmstart}`,()=>{
 const w=new R.World({x:0,y:-9.81,z:0});
 try {
  w.timestep=1/60;w.integrationParameters.contactRecycling=recycling;w.integrationParameters.warmstartCoefficient=warmstart;
  const floor=w.createCollider(R.ColliderDesc.cuboid(5,.1,5));
  const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,1,0));
  const ball=w.createCollider(R.ColliderDesc.ball(.1).setRestitution(0),body);
  let contacts=0;
  for(let i=0;i<120;i++){
   w.step();
   w.solverContactPair(floor,ball,m=>{contacts+=m.numSolverContacts();});
   expect(Number.isFinite(body.translation().y)).toBe(true);
  }
  expect(contacts).toBeGreaterThan(0);
  expect(body.translation().y).toBeGreaterThan(.18);
  expect(body.translation().y).toBeLessThan(.22);
  expect(Math.abs(body.linvel().y)).toBeLessThan(.1);
 }finally{w.free();}
});
