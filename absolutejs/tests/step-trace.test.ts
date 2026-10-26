import {beforeAll, expect, test} from 'bun:test';
import R from '../../dist/rapier.mjs';
beforeAll(async()=>{await R.init();});
const fixture=()=>{
 const w=new R.World({x:0,y:-9.81,z:0});
 w.integrationParameters.maxCcdSubsteps=4;
 const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,2,0).setCcdEnabled(true));
 w.createCollider(R.ColliderDesc.ball(.1),b);
 w.createCollider(R.ColliderDesc.cuboid(10,.1,10).setTranslation(0,-.1,0));
 return {w,b};
};
test('step traces are opt-in, owned, fresh and preserve snapshot motion',()=>{
 const {w,b}=fixture();const other=R.World.restoreSnapshot(w.takeSnapshot());
 try {
  expect(w.stepTraceEnabled).toBe(false);expect(w.stepTrace()).toBeNull();
  w.stepTraceEnabled=true;expect(w.stepTrace()).toBeNull();
  for(let i=0;i<128;i++) {
   w.step();other.step();
   expect(w.takeSnapshot()).toEqual(other.takeSnapshot());
   const trace=w.stepTrace()!;
   expect(trace.schemaVersion).toBe(1);expect(trace.stride).toBe(27);expect(trace.truncated).toBe(false);
   expect(trace.data.length%27).toBe(0);expect(trace.data.length/27).toBeLessThanOrEqual(1024);
   expect([...trace.data].every(Number.isFinite)).toBe(true);
   const rows=Array.from({length:trace.data.length/27},(_,n)=>Array.from(trace.data.slice(n*27,(n+1)*27)));
   const last=rows.filter(r=>r[0]===4).at(-1)!;
   expect(last.slice(6,9)).toEqual(Object.values(b.translation()));
   const initial=trace.data[0];trace.data[0]=99;expect(w.stepTrace()!.data[0]).toBe(initial);
  }
  const restored=R.World.restoreSnapshot(w.takeSnapshot());
  try {expect(restored.stepTraceEnabled).toBe(false);expect(restored.stepTrace()).toBeNull();}finally{restored.free();}
  w.stepTraceEnabled=true;expect(w.stepTrace()).toBeNull();
  w.step();expect(w.stepTrace()).not.toBeNull();
  w.timestep=0;w.step();expect(w.stepTrace()!.data.length).toBe(0);
  w.stepTraceEnabled=false;expect(w.stepTrace()).toBeNull();
 }finally{w.free();other.free();}
});
test('step trace rejects invalid flags and reports a bounded body-limit overflow',()=>{
 const w=new R.World({x:0,y:0,z:0});
 try {
  for(const bad of [0,1,'true',null,undefined]) {
   expect(()=>{w.stepTraceEnabled=bad as unknown as boolean;}).toThrow(TypeError);
   expect(w.stepTraceEnabled).toBe(false);
  }
  for(let i=0;i<33;i++) w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(i,0,0));
  const before=w.takeSnapshot();const control=R.World.restoreSnapshot(before);
  try {
   w.stepTraceEnabled=true;w.step();control.step();
   expect(w.takeSnapshot()).toEqual(control.takeSnapshot());
   expect(w.stepTrace()!.truncated).toBe(true);expect(w.stepTrace()!.data.length).toBe(0);
   w.stepTraceEnabled=false;expect(w.stepTrace()).toBeNull();
  }finally{control.free();}
 }finally{w.free();}
});

test('step trace attributes accepted static CCD clamps without changing the solve',()=>{
 const {w,b}=fixture();w.integrationParameters.maxCcdSubsteps=1;b.setLinvel({x:0,y:-240,z:0},true);
 const control=R.World.restoreSnapshot(w.takeSnapshot());
 try {
  w.stepTraceEnabled=true;w.step();control.step();
  expect(w.takeSnapshot()).toEqual(control.takeSnapshot());
  const trace=w.stepTrace()!;
  expect(trace.impactStride).toBe(7);expect(trace.impacts.length).toBeGreaterThanOrEqual(7);
  expect(trace.impacts.length%7).toBe(0);expect(trace.impacts.length).toBeLessThanOrEqual(1024*7);
  expect([...trace.impacts].every(Number.isFinite)).toBe(true);
  expect(Array.from(trace.impacts.slice(3,5))).toEqual([-1,-1]);
  expect(trace.impacts[5]).toBeGreaterThan(0);expect(trace.impacts[5]).toBeLessThan(1);
  expect(trace.impacts[6]).toBe(1);
  trace.impacts[5]=99;expect(w.stepTrace()!.impacts[5]).toBeLessThan(1);
  w.stepTraceEnabled=false;expect(w.stepTrace()).toBeNull();
 }finally{w.free();control.free();}
});
