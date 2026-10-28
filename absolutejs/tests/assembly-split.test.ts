import {beforeAll,expect,test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
type V={x:number;y:number;z:number};
const add=(a:V,b:V):V=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:V,b:V):V=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a:V,k:number):V=>({x:a.x*k,y:a.y*k,z:a.z*k});
const dot=(a:V,b:V)=>a.x*b.x+a.y*b.y+a.z*b.z;
const norm=(a:V)=>Math.sqrt(dot(a,a));
const cross=(a:V,b:V):V=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
function measure(bodies:R.RigidBody[],prescribed?:{center:V;v:V;w:V}) {
 const mass=bodies.reduce((sum,b)=>sum+b.mass(),0);
 const center=bodies.reduce((sum,b)=>add(sum,mul(b.worldCom(),b.mass()/mass)),{x:0,y:0,z:0});
 let p:V={x:0,y:0,z:0},l:V={x:0,y:0,z:0},energy=0;
 for(const b of bodies) {
  const c=b.worldCom(),m=b.mass(),inertia=b.principalInertia();
  expect(inertia.x).toBe(inertia.y);expect(inertia.x).toBe(inertia.z);
  const w=prescribed?.w??b.angvel();
  const v=prescribed?add(prescribed.v,cross(w,sub(c,prescribed.center))):b.linvel();
  const momentum=mul(v,m);p=add(p,momentum);
  l=add(l,add(mul(w,inertia.x),cross(sub(c,center),momentum)));
  energy+=.5*(m*dot(v,v)+inertia.x*dot(w,w));
 }
 return {mass,center,p,l,energy};
}
function fixture() {
 const world=new R.World({x:0,y:0,z:0});world.timestep=1/120;
 world.numSolverIterations=4;world.integrationParameters.maxCcdSubsteps=0;
 const q={x:0,y:0,z:0,w:1};
 const bodies=Array.from({length:4},(_,i)=>{
  const m=i+1;
  return world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(i,0,0)
   .setAdditionalMassProperties(m,{x:.1*m,y:.05*m,z:-.02*m},{x:.2*m,y:.2*m,z:.2*m},q));
 });
 const joints=bodies.slice(1).map((b,i)=>world.createMultibodyJoint(R.JointData.fixed({x:1,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[i]!,b,true));
 expect(world.multibodyJoints.setGeneralizedDamping(joints[0]!.handle,new Float32Array(6))).toBe(true);
 world.step();bodies[0]!.addForce({x:30,y:-20,z:10},true);bodies[0]!.addTorque({x:120,y:-80,z:160},true);
 world.step();bodies[0]!.resetForces(true);bodies[0]!.resetTorques(true);
 for(let i=0;i<24;i++)world.step();
 return {world,bodies,joints};
}
test('partial fixed-chain split preserves motion and exact snapshot replay',()=>{
 const {world:w,bodies,joints}=fixture();let restored:R.World|undefined;
 try {
  const initial=measure(bodies);expect(initial.energy).toBeGreaterThan(.01);
  w.removeMultibodyJoint(joints[1]!,true);
  const snapshot=w.takeSnapshot();restored=R.World.restoreSnapshot(snapshot);
  expect(restored.takeSnapshot()).toEqual(snapshot);w.profilerEnabled=true;
  for(let i=0;i<120;i++) {
   w.step();restored.step();expect(w.takeSnapshot()).toEqual(restored.takeSnapshot());
   const now=measure(bodies);
   expect(norm(sub(now.p,initial.p))/norm(initial.p)).toBeLessThan(1e-4);
   expect(norm(sub(now.l,initial.l))/norm(initial.l)).toBeLessThan(1e-4);
   expect(Math.abs(now.energy/initial.energy-1)).toBeLessThan(1e-4);
   expect(w.freeAssemblyStats()!.acceptedSteps).toBe(8);
  }
 }finally{restored?.free();w.free();}
});
test('surviving root retains explicit damping immediately and after a split step',()=>{
 const {world:w,joints}=fixture();try {
  const damping=new Float32Array([.1,.2,.3,.4,.5,.6]);
  expect(w.multibodyJoints.setGeneralizedDamping(joints[0]!.handle,damping)).toBe(true);
  w.removeMultibodyJoint(joints[1]!,true);
  expect(w.multibodyJoints.generalizedDamping(joints[0]!.handle)).toEqual(damping);
  w.profilerEnabled=true;w.step();
  expect(w.multibodyJoints.generalizedDamping(joints[0]!.handle)).toEqual(damping);
  expect(w.multibodyJoints.generalizedDamping(joints[2]!.handle)).toEqual(new Float32Array(6));
  expect(w.freeAssemblyStats()!.acceptedSteps).toBe(4);
 }finally{w.free();}
});
test('fixed-to-dynamic root uses prescribed world COM and angular velocity',()=>{
 const {world:w,bodies}=fixture();try {
  const root=bodies[0]!;root.setBodyType(R.RigidBodyType.Fixed,true);w.step();
  root.setBodyType(R.RigidBodyType.Dynamic,true);
  const v={x:.3,y:-.2,z:.1},angular={x:2,y:-3,z:4};
  root.setLinvel(v,true);root.setAngvel(angular,true);
  const initial=measure(bodies,{center:root.worldCom(),v,w:angular});
  w.profilerEnabled=true;w.step();const now=measure(bodies);
  expect(norm(sub(now.p,initial.p))/norm(initial.p)).toBeLessThan(1e-4);
  expect(norm(sub(now.l,initial.l))/norm(initial.l)).toBeLessThan(1e-4);
  expect(Math.abs(now.energy/initial.energy-1)).toBeLessThan(1e-4);
  expect(w.freeAssemblyStats()!.acceptedSteps).toBe(4);
 }finally{w.free();}
});
