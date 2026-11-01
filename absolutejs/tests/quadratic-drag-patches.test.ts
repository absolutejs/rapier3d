import {beforeAll,expect,test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
const vector=(x=0,y=0,z=0)=>({x,y,z});
const patch=(offset=vector(),direction=vector(1),fluidVelocity=vector(4),quadraticResistance=2,oneSided=false)=>({offset,direction,fluidVelocity,quadraticResistance,oneSided});
const base={linearVelocity:vector(7),angularVelocity:vector(),inverseMass:vector(.5,.5,.5),inverseInertia:[1,0,0,1,0,1] as const,patches:[patch()],dt:.25};
test('one batched channel preserves the scalar solution and all caller storage',()=>{
 const input=structuredClone(base),before=structuredClone(input),r=R.solveQuadraticDragPatches(input);
 expect(r.impulse.x).toBeCloseTo(-2,13);expect(r.linearVelocity.x).toBeCloseTo(6,13);
 expect(r.dissipatedEnergy).toBeCloseTo(5,13);expect(r.bodyWork).toBeCloseTo(-13,13);
 expect(r.activePatches).toBe(1);expect(input).toEqual(before);
 const scaled=R.solveQuadraticDragPatches({...input,patches:[patch(vector(),vector(100))]});
 expect(scaled).toEqual(r);
});
test('double-precision coupled patch response closes its body and reservoir work',()=>{
 const patches=Array.from({length:300},(_,i)=>patch(vector(Math.sin(i)*.3,Math.cos(i)*.2,.1),vector(Math.sin(i*.7),Math.cos(i*.3),.5),vector(.4,.2,0),.01+(i%7),i%2===0));
 const input={...base,linearVelocity:vector(2,1,-.5),angularVelocity:vector(.3,.6,1),inverseMass:vector(.5,.25,1),inverseInertia:[2,.2,.1,3,.4,4] as const,patches,dt:.1};
 const [a,b,c,d,e,f]=input.inverseInertia,det=a*d*f+2*b*c*e-a*e*e-d*c*c-f*b*b;
 const m=[(d*f-e*e)/det,(c*e-b*f)/det,(b*e-c*d)/det,(a*f-c*c)/det,(b*c-a*e)/det,(a*d-b*b)/det];
 const energy=(v:{x:number;y:number;z:number},w:{x:number;y:number;z:number})=>.5*(v.x*v.x/.5+v.y*v.y/.25+v.z*v.z)+.5*(m[0]!*w.x*w.x+m[3]!*w.y*w.y+m[5]!*w.z*w.z+2*m[1]!*w.x*w.y+2*m[2]!*w.x*w.z+2*m[4]!*w.y*w.z);
 const r=R.solveQuadraticDragPatches(input),delta=energy(r.linearVelocity,r.angularVelocity)-energy(input.linearVelocity,input.angularVelocity);
 expect(delta).toBeCloseTo(r.bodyWork,12);
 expect(delta-r.reservoirWork).toBeCloseTo(-r.dissipatedEnergy,12);
 expect(r.dissipatedEnergy).toBeGreaterThan(0);
 expect(r.linearVelocity.x-input.linearVelocity.x).toBeCloseTo(r.impulse.x*.5,13);
 expect(r.angularVelocity.x-input.angularVelocity.x).toBeCloseTo(a*r.angularImpulse.x+b*r.angularImpulse.y+c*r.angularImpulse.z,13);
});
test('locked and inactive patches are explicit; invalid patches cannot mutate inputs',()=>{
 const input={...base,inverseMass:vector(),inverseInertia:[0,0,0,0,0,0] as const};
 const r=R.solveQuadraticDragPatches(input);expect(r.lockedPatches).toBe(1);expect(r.impulse).toEqual(vector());
 expect(R.solveQuadraticDragPatches({...base,patches:[patch(vector(),vector(-1),vector(),2,true)]}).activePatches).toBe(0);
 const empty=R.solveQuadraticDragPatches({...base,patches:[]});expect(empty.linearVelocity).toEqual(base.linearVelocity);expect(empty.linearVelocity).not.toBe(base.linearVelocity);
 for(const change of [{inverseInertia:[1,2,0,1,0,1]},{inverseInertia:[1,0,0,-1,0,1]},{inverseMass:vector(-1)},
  {patches:[patch(vector(),vector())]},{patches:[patch(vector(NaN))]},{patches:[patch(vector(),vector(1),vector(),-1)]},
  {patches:Array.from({length:4097},()=>patch())},{dt:NaN}])expect(()=>R.solveQuadraticDragPatches({...base,...change} as any)).toThrow();
 expect(base.linearVelocity).toEqual(vector(7));
});
test('combined native impulses reproduce the double-precision patch result in two unit systems',()=>{
 for(const u of [1,100]){
  const world=new R.World(vector());
  try{
   const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation({x:0,y:Math.sin(.2),z:0,w:Math.cos(.2)}));
   world.createCollider(R.ColliderDesc.cuboid(.4*u,.2*u,.1*u).setDensity(31.25/u**3),b);b.recomputeMassPropertiesFromColliders();
   b.setLinvel(vector(2*u,.3*u,-.1*u),true);b.setAngvel(vector(.2,.1,.5),true);
   const v=b.linvel(),w=b.angvel(),m=b.effectiveWorldInvInertia(),im=b.effectiveInvMass();
   const patches=Array.from({length:400},(_,i)=>patch(vector(Math.sin(i)*.3,Math.cos(i)*.2,.1),vector(Math.sin(i*.7),Math.cos(i*.3),.5),vector(.7),.02,true));
   const r=R.solveQuadraticDragPatches({linearVelocity:vector(v.x/u,v.y/u,v.z/u),angularVelocity:w,inverseMass:im,
    inverseInertia:[m.m11*u*u,m.m12*u*u,m.m13*u*u,m.m22*u*u,m.m23*u*u,m.m33*u*u],patches,dt:1/60});
   b.applyImpulse(vector(r.impulse.x*u,r.impulse.y*u,r.impulse.z*u),true);
   b.applyTorqueImpulse(vector(r.angularImpulse.x*u*u,r.angularImpulse.y*u*u,r.angularImpulse.z*u*u),true);
   const after=b.linvel(),spin=b.angvel();
   for(const k of ['x','y','z'] as const){expect(Math.abs(after[k]/u-r.linearVelocity[k])).toBeLessThan(1e-6);expect(Math.abs(spin[k]-r.angularVelocity[k])).toBeLessThan(1e-6);}
  }finally{world.free();}
 }
});
