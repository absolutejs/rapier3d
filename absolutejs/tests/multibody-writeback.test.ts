import { beforeAll, expect, test } from 'bun:test';
import type RAPIER from '@absolutejs/rapier3d';
const R:typeof RAPIER=(await import(process.env.RAPIER_TEST_ENGINE ?? '@absolutejs/rapier3d')).default;
beforeAll(async()=>{await R.init();});

test('articulation link velocities expose current solved momentum at every step',()=>{
 for(const angle of [0,.37,1.1])for(const hz of [60,240,960])for(const units of [1,100])for(const reverse of [false,true]){
  const world=new R.World({x:0,y:0,z:0});
  try{
   world.timestep=1/hz;world.lengthUnit=units;world.numSolverIterations=4;
   const c=Math.cos(angle),s=Math.sin(angle),q={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};
   const bodies:RAPIER.RigidBody[]=[];const masses=[2,3,5];
   for(const i of reverse?[2,1,0]:[0,1,2]){
    const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i*.65*units*c,i*.65*units*s,0).setRotation(q).setLinvel(i===2?-4*units*c:0,i===2?-4*units*s:0,0).setCanSleep(false).setCcdEnabled(true));
    world.createCollider(R.ColliderDesc.ball(.25*units).setMass(masses[i]!).setRestitution(1).setFriction(0),b);bodies[i]=b;
   }
   const identity={x:0,y:0,z:0,w:1};
   world.createMultibodyJoint(R.JointData.fixed({x:.65*units,y:0,z:0},identity,{x:0,y:0,z:0},identity),bodies[0]!,bodies[1]!,true).setContactsEnabled(false);
   for(let step=0;step<hz/4;step++){
    world.step();let px=0,py=0,pz=0;
    for(let i=0;i<3;i++){
     const v=bodies[i]!.linvel();px+=masses[i]!*v.x/units;py+=masses[i]!*v.y/units;pz+=masses[i]!*v.z/units;
    }
    expect(Math.hypot(px+20*c,py+20*s,pz)).toBeLessThan(2e-4);
   }
   for(let i=0;i<3;i++){
    const v=bodies[i]!.linvel(),speed=i===2?0:-4;
    expect(Math.hypot(v.x/units-speed*c,v.y/units-speed*s,v.z/units)).toBeLessThan(3e-4);
   }
  }finally{world.free();}
 }
});

test('fixed articulation velocities use final COM geometry after off-center impacts',()=>{
 for(const hz of [60,240,960])for(const units of [1,100])for(const localOffset of [0,.07])for(const angle of [0,.37]){
  const world=new R.World({x:0,y:0,z:0});
  try{
   world.timestep=1/hz;world.lengthUnit=units;world.numSolverIterations=4;
   const c=Math.cos(angle),s=Math.sin(angle),q={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};
   const body=(x:number,y:number,speed:number)=>world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation((x*c-y*s)*units,(x*s+y*c)*units,0).setRotation(q).setLinvel(speed*c*units,speed*s*units,0).setCanSleep(false).setCcdEnabled(true));
   const a=body(-.65,0,0),b=body(0,0,0),incoming=body(.65,.15,-4);
   world.createCollider(R.ColliderDesc.ball(.25*units).setTranslation(0,localOffset*units,0).setMass(2).setFriction(0).setRestitution(1),a);
   world.createCollider(R.ColliderDesc.ball(.25*units).setTranslation(0,-localOffset*units,0).setMass(3).setFriction(0).setRestitution(1),b);
   world.createCollider(R.ColliderDesc.ball(.25*units).setMass(5).setFriction(0).setRestitution(1),incoming);
   const identity={x:0,y:0,z:0,w:1};
   world.createMultibodyJoint(R.JointData.fixed({x:.65*units,y:0,z:0},identity,{x:0,y:0,z:0},identity),a,b,true).setContactsEnabled(false);
   let maximumSpin=0;
   for(let step=0;step<hz/4;step++){
    world.step();
    const ca=a.worldCom(),cb=b.worldCom(),va=a.linvel(),vb=b.linvel(),w=a.angvel(),wb=b.angvel();
    const dx=cb.x-ca.x,dy=cb.y-ca.y,dz=cb.z-ca.z;
    const error=Math.hypot(vb.x-va.x-w.y*dz+w.z*dy,vb.y-va.y-w.z*dx+w.x*dz,vb.z-va.z-w.x*dy+w.y*dx)/units;
    expect(error).toBeLessThan(3e-5);
    expect(Math.hypot(w.x-wb.x,w.y-wb.y,w.z-wb.z)).toBeLessThan(3e-5);
    maximumSpin=Math.max(maximumSpin,Math.hypot(w.x,w.y,w.z));
   }
   expect(maximumSpin).toBeGreaterThan(.1);
  }finally{world.free();}
 }
});

test('a revolute articulation exposes COM velocity tangent to its current hinge',()=>{
 for(const hz of [60,240])for(const units of [1,100]){
  const world=new R.World({x:9.81*units,y:0,z:0});
  try{
   world.timestep=1/hz;world.lengthUnit=units;
   const root=world.createRigidBody(R.RigidBodyDesc.fixed());
   const link=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,-units,0).setCanSleep(false));
   world.createCollider(R.ColliderDesc.ball(.1*units).setTranslation(.07*units,0,0).setMass(2),link);
   world.createMultibodyJoint(R.JointData.revolute({x:0,y:0,z:0},{x:0,y:units,z:0},{x:0,y:0,z:1}),root,link,true);
   let spin=0;
   for(let step=0;step<hz/2;step++){
    world.step();const c=link.worldCom(),v=link.linvel(),w=link.angvel();
    expect(Math.hypot(v.x-w.y*c.z+w.z*c.y,v.y-w.z*c.x+w.x*c.z,v.z-w.x*c.y+w.y*c.x)/units).toBeLessThan(3e-5);
    spin=Math.max(spin,Math.hypot(w.x,w.y,w.z));
   }
   expect(spin).toBeGreaterThan(.1);
  }finally{world.free();}
 }
});
