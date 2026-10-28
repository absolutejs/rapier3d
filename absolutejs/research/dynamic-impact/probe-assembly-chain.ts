import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type RAPIER from '@absolutejs/rapier3d';
const mode=process.env.CHAIN_JOINT_MODE ?? 'impulse';
if(mode!=='impulse'&&mode!=='multibody')throw Error('Unknown joint mode');
const stationary=process.env.CHAIN_FRAME==='stationary';
if(process.env.CHAIN_FRAME && !['stationary','moving'].includes(process.env.CHAIN_FRAME))throw Error('Unknown inertial frame');
const out=resolve(process.argv[2]!); mkdirSync(out);
const api=resolve(process.env.IMPACT_ENGINE ?? 'dist/rapier.mjs');
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hashes={api:hash(api),probe:hash(import.meta.path)};
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
writeFileSync(`${out}/manifest.json`,JSON.stringify({hashes,api,mode,stationary,scope:'CPU-only collinear fixed-joint chains; independent equal-mass elastic oracle'},null,2));
const R:typeof RAPIER=(await import(api)).default;await R.init();
const rows=[];
for(const count of [2,4,8,16]) for(const reverse of [false,true]) for(const hz of [60,240]) {
 const fixture={mode,stationary,count,reverse,hz};
 const initialEnergy=count*(stationary?8:4),initialMomentum=stationary?-4*count:0;
 writeFileSync(`${out}/active-case.json`,JSON.stringify(fixture));
 const world=new R.World({x:0,y:0,z:0});
 try{
  world.timestep=1/hz;world.numSolverIterations=4;
  const bodies:RAPIER.RigidBody[]=[];
  const order=Array.from({length:count+1},(_,i)=>i);if(reverse)order.reverse();
  for(const i of order){
   const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i*.65,0,0).setLinvel(i===count?(stationary?-4:-2):(stationary?0:2),0,0).setCanSleep(false).setCcdEnabled(true));
   world.createCollider(R.ColliderDesc.ball(.25).setMass(i===count?count:1).setFriction(0).setRestitution(1),b);bodies[i]=b;
  }
  const q={x:0,y:0,z:0,w:1};
  for(let i=1;i<count;i++){
   const data=R.JointData.fixed({x:.65,y:0,z:0},q,{x:0,y:0,z:0},q);
   const joint=mode==='multibody'?world.createMultibodyJoint(data,bodies[i-1]!,bodies[i]!,true):world.createImpulseJoint(data,bodies[i-1]!,bodies[i]!,true);
   joint.setContactsEnabled(false);
  }
  let maxJointVelocityError=0,maxEnergyGain=0,maxMomentumError=0,maxSpin=0,maxTransverseSpeed=0;
  let captured=false;
  for(let step=0;step<hz/2;step++){
   const before=world.takeSnapshot();
   world.step();
   if(step===0)writeFileSync(`${out}/initial-drift-${count}-${Number(reverse)}-${hz}.json`,JSON.stringify(bodies.map(b=>({v:b.linvel(),mass:b.mass()})),null,2));
   let e=0,momentum=0,mismatch=0;
   for(let i=0;i<=count;i++){
    const v=bodies[i]!.linvel();e+=.5*(i===count?count:1)*(v.x*v.x+v.y*v.y+v.z*v.z);
    momentum+=(i===count?count:1)*v.x;
    const w=bodies[i]!.angvel();maxSpin=Math.max(maxSpin,Math.hypot(w.x,w.y,w.z));
    maxTransverseSpeed=Math.max(maxTransverseSpeed,Math.hypot(v.y,v.z));
    if(i>0&&i<count)mismatch=Math.max(mismatch,Math.abs(v.x-bodies[i-1]!.linvel().x));
   }
   maxJointVelocityError=Math.max(maxJointVelocityError,mismatch);
   maxMomentumError=Math.max(maxMomentumError,Math.abs(momentum-initialMomentum));
   maxEnergyGain=Math.max(maxEnergyGain,e-initialEnergy);
   if(!captured&&(mismatch>1e-3||Math.abs(momentum-initialMomentum)>1e-3)){
    const after=world.takeSnapshot(), replay=R.World.restoreSnapshot(before);
    let roundTrip=false,exact=false;
    try{roundTrip=digest(replay.takeSnapshot())===digest(before);replay.step();exact=digest(replay.takeSnapshot())===digest(after);}finally{replay.free();}
    const prefix=`${out}/first-failure-${count}-${Number(reverse)}-${hz}`;
    writeFileSync(`${prefix}-before.bin`,before);writeFileSync(`${prefix}-after.bin`,after);
    writeFileSync(`${prefix}.json`,JSON.stringify({fixture,step,mismatch,momentum,expectedMomentum:initialMomentum,energy:e,beforeSha256:digest(before),afterSha256:digest(after),roundTrip,exact},null,2));
    if(!roundTrip||!exact)throw Error('Snapshot reproduction failed');
    captured=true;
   }
  }
  const velocities=bodies.map(b=>b.linvel().x);
  const energy=velocities.reduce((e,v,i)=>e+.5*(i===count?count:1)*v*v,0);
  const row={mode,stationary,count,reverse,hz,initialEnergy,initialMomentum,finalLinearEnergy:energy,maxEnergyGain,maxJointVelocityError,maxMomentumError,maxSpin,maxTransverseSpeed,captured,maxFinalVelocityError:Math.max(...velocities.map((v,i)=>Math.abs(v-(i===count?(stationary?0:2):(stationary?-4:-2))))),velocities};
  rows.push(row);writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));
 }finally{world.free();}
}
if(hash(api)!==hashes.api||hash(import.meta.path)!==hashes.probe)throw Error('Inputs changed');
writeFileSync(`${out}/complete.json`,JSON.stringify({cases:rows.length,sourceUnchanged:true}));
