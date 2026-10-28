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
