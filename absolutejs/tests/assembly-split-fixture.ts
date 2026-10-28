import R from '@absolutejs/rapier3d';
export type V={x:number;y:number;z:number};
const add=(a:V,b:V):V=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
export const sub=(a:V,b:V):V=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a:V,k:number):V=>({x:a.x*k,y:a.y*k,z:a.z*k});
const dot=(a:V,b:V)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const norm=(a:V)=>Math.sqrt(dot(a,a));
const cross=(a:V,b:V):V=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
export function measure(bodies:R.RigidBody[],prescribed?:{center:V;v:V;w:V}) {
 const mass=bodies.reduce((sum,b)=>sum+b.mass(),0);
 const center=bodies.reduce((sum,b)=>add(sum,mul(b.worldCom(),b.mass()/mass)),{x:0,y:0,z:0});
 let p:V={x:0,y:0,z:0},l:V={x:0,y:0,z:0},energy=0;
 for(const b of bodies) {
  const c=b.worldCom(),m=b.mass(),inertia=b.principalInertia();
  if(inertia.x!==inertia.y||inertia.x!==inertia.z)throw Error('Fixture requires isotropic individual bodies');
  const w=prescribed?.w??b.angvel();
  const v=prescribed?add(prescribed.v,cross(w,sub(c,prescribed.center))):b.linvel();
  const momentum=mul(v,m);p=add(p,momentum);
  l=add(l,add(mul(w,inertia.x),cross(sub(c,center),momentum)));
  energy+=.5*(m*dot(v,v)+inertia.x*dot(w,w));
 }
 return {mass,center,p,l,energy};
}
export function fixture(engine=R) {
 const world=new engine.World({x:0,y:0,z:0});world.timestep=1/120;
 world.numSolverIterations=4;world.integrationParameters.maxCcdSubsteps=0;
 const q={x:0,y:0,z:0,w:1};
 const bodies=Array.from({length:4},(_,i)=>{
  const m=i+1;
  return world.createRigidBody(engine.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(i,0,0)
   .setAdditionalMassProperties(m,{x:.1*m,y:.05*m,z:-.02*m},{x:.2*m,y:.2*m,z:.2*m},q));
 });
 const joints=bodies.slice(1).map((b,i)=>world.createMultibodyJoint(engine.JointData.fixed({x:1,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[i]!,b,true));
 if(!world.multibodyJoints.setGeneralizedDamping(joints[0]!.handle,new Float32Array(6)))throw Error('Fixture damping rejected');
 world.step();bodies[0]!.addForce({x:30,y:-20,z:10},true);bodies[0]!.addTorque({x:120,y:-80,z:160},true);
 world.step();bodies[0]!.resetForces(true);bodies[0]!.resetTorques(true);
 for(let i=0;i<24;i++)world.step();
 return {world,bodies,joints};
}
