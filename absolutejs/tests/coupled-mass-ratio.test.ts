import {beforeAll,expect,test} from 'bun:test';
import type RAPIER from '@absolutejs/rapier3d';
const R:typeof RAPIER=(await import(process.env.RAPIER_TEST_ENGINE??'@absolutejs/rapier3d')).default;
beforeAll(async()=>{await R.init();});
for(const masses of [[20,1,20],[5,1,20],[20,1,5]])for(const e of [.5,1])
for(const hz of [60,240])for(const reverse of [false,true]) {
 test(`coupled mass ratio ${masses.join('/')} e=${e} hz=${hz} reverse=${reverse}`,()=>{
  const w=new R.World({x:0,y:0,z:0});
  try{
   w.timestep=1/hz;w.numSolverIterations=4;
   w.integrationParameters.numInternalPgsIterations=16;
   w.integrationParameters.contact_natural_frequency=0;
   const [ml,mc,mr]=masses as [number,number,number];
   const specs=[[-.325,mc/2,0],[.325,mc/2,0],[-.825,ml,4],[.825,mr,-4]];
   const bodies:RAPIER.RigidBody[]=[];
   for(const i of reverse?[3,2,1,0]:[0,1,2,3]){
    const [x,m,v]=specs[i]!;
    const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x!,0,0).setLinvel(v!,0,0).setCanSleep(false).setCcdEnabled(true));
    w.createCollider(R.ColliderDesc.ball(.25).setMass(m!).setFriction(0).setRestitution(e),b);
    b.recomputeMassPropertiesFromColliders();bodies[i]=b;
   }
   const q={x:0,y:0,z:0,w:1};
   const j=w.createMultibodyJoint(R.JointData.fixed({x:.65,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[0]!,bodies[1]!,true);
   j.setContactsEnabled(false);
   const d=w.multibodyJoints.generalizedDamping(j.handle)!;
   expect(w.multibodyJoints.setGeneralizedDamping(j.handle,d.fill(0))).toBe(true);
   const center=(1+e)*4*(ml-mr)/(ml+mc+mr);
   const target=[center,center,center-4*e,center+4*e];
   for(let step=0;step<hz/4;step++){
    w.step();
    const velocity=bodies.map(b=>b.linvel().x);
    for(let i=0;i<4;i++)expect(Math.abs(velocity[i]!-target[i]!)).toBeLessThan(.001);
    const momentum=velocity.reduce((s,v,i)=>s+specs[i]![1]!*v,0);
    expect(Math.abs(momentum-4*(ml-mr))).toBeLessThan(.0001);
    const energy=velocity.reduce((s,v,i)=>s+.5*specs[i]![1]!*v*v,0);
    const expectedEnergy=target.reduce((s,v,i)=>s+.5*specs[i]![1]!*v*v,0);
    expect(Math.abs(energy-expectedEnergy)).toBeLessThan(.001);
   }
  }finally{w.free();}
 });
}
