import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type RAPIER from '@absolutejs/rapier3d';
const out=resolve(process.argv[2]!); mkdirSync(out);
const api=resolve(process.env.IMPACT_ENGINE ?? 'dist/rapier.mjs');
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hashes={api:hash(api),probe:hash(import.meta.path)};
writeFileSync(`${out}/manifest.json`,JSON.stringify({hashes,api,scope:'CPU-only collinear fixed-joint chains; independent equal-mass elastic oracle'},null,2));
const R:typeof RAPIER=(await import(api)).default;await R.init();
const rows=[];
for(const count of [2,4,8,16]) for(const reverse of [false,true]) for(const hz of [60,240]) {
 const world=new R.World({x:0,y:0,z:0});
 try{
  world.timestep=1/hz;world.numSolverIterations=4;
  const bodies:RAPIER.RigidBody[]=[];
  const order=Array.from({length:count+1},(_,i)=>i);if(reverse)order.reverse();
  for(const i of order){
   const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i*.65,0,0).setLinvel(i===count?-2:2,0,0).setCanSleep(false).setCcdEnabled(true));
   world.createCollider(R.ColliderDesc.ball(.25).setMass(i===count?count:1).setFriction(0).setRestitution(1),b);bodies[i]=b;
  }
  const q={x:0,y:0,z:0,w:1};
  for(let i=1;i<count;i++)world.createImpulseJoint(R.JointData.fixed({x:.65,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[i-1]!,bodies[i]!,true).setContactsEnabled(false);
  let maxJointVelocityError=0,maxEnergyGain=0;
  for(let step=0;step<hz/2;step++){
   world.step();let e=0;
   for(let i=0;i<=count;i++){
    const v=bodies[i]!.linvel();e+=.5*(i===count?count:1)*(v.x*v.x+v.y*v.y+v.z*v.z);
    if(i>0&&i<count)maxJointVelocityError=Math.max(maxJointVelocityError,Math.abs(v.x-bodies[i-1]!.linvel().x));
   }
   maxEnergyGain=Math.max(maxEnergyGain,e-count*4);
  }
  const velocities=bodies.map(b=>b.linvel().x);
  const energy=velocities.reduce((e,v,i)=>e+.5*(i===count?count:1)*v*v,0);
  const row={count,reverse,hz,initialEnergy:count*4,finalLinearEnergy:energy,maxEnergyGain,maxJointVelocityError,maxFinalVelocityError:Math.max(...velocities.map((v,i)=>Math.abs(v-(i===count?2:-2)))),velocities};
  rows.push(row);writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));
 }finally{world.free();}
}
if(hash(api)!==hashes.api||hash(import.meta.path)!==hashes.probe)throw Error('Inputs changed');
writeFileSync(`${out}/complete.json`,JSON.stringify({cases:rows.length,sourceUnchanged:true}));
