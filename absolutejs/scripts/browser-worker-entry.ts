import {qualifyPredictiveReplay} from '../tests/predictive-recycle-fixture';
import R from '../../dist/rapier.mjs';
import {buildInfo} from '../../dist/build-info.mjs';
import {fixture} from '../tests/fixture';
import {equalSnapshot,wakeFixture} from '../tests/snapshot-order-fixture';
import {rotate, unit, vector, type V} from '../research/gyroscopic-precision/free-spin-math';
try {
 await Promise.all([R.init(),R.init()]);
 const response=await fetch('/simplex-fixture.bin');
 if(!response.ok)throw Error('Simplex fixture unavailable');
 const simplexBytes=new Uint8Array(await response.arrayBuffer());
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',simplexBytes)),v=>v.toString(16).padStart(2,'0')).join('');
 if(digest!=='c865ce89eaec5ddd19ea2a32884cf0b4e744cb5b856969535b705d473b7fe195')throw Error('Simplex fixture identity mismatch');
 const simplexWorld=R.World.restoreSnapshot(simplexBytes);let simplexMinimumDistanceCm=Infinity;
 try {
  const floor=simplexWorld.getCollider(0),wood=simplexWorld.getCollider(2e-323);
  simplexWorld.step();let count=0;
  simplexWorld.contactPair(floor,wood,m=>{for(let i=0;i<m.numContacts();i++){count++;simplexMinimumDistanceCm=Math.min(simplexMinimumDistanceCm,m.contactDist(i));}});
  if(!count||!Number.isFinite(simplexMinimumDistanceCm)||simplexMinimumDistanceCm<=-0.01)throw Error('Invalid floor/hull simplex witness');
 }finally{simplexWorld.free();}
 // Browser-worker qualification of coupled heavy impacts on a light articulation.
 let coupledCases=0,coupledMaximumEnergyError=0,coupledMaximumVelocityError=0;
 for(const restitution of [0,.5,1])for(const reverse of [false,true]){
  const impact=new R.World({x:0,y:0,z:0});
  try{
   if(impact.contactConvergence()!==null)throw Error('Fresh convergence data must be unavailable');
   impact.profilerEnabled=true;
   impact.timestep=1/60;impact.numSolverIterations=1;
   impact.integrationParameters.numInternalPgsIterations=1;
   impact.integrationParameters.contact_natural_frequency=0;
   const specs=[[-.325,.5,0],[.325,.5,0],[-.825,20,4],[.825,20,-4]];
   const bodies:any[]=[];
   for(const i of reverse?[3,2,1,0]:[0,1,2,3]){
    const [x,mass,vx]=specs[i]!;
    const body=impact.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x!,0,0).setLinvel(vx!,0,0).setCanSleep(false).setCcdEnabled(true));
    impact.createCollider(R.ColliderDesc.ball(.25).setMass(mass!).setFriction(0).setRestitution(restitution),body);
    body.recomputeMassPropertiesFromColliders();bodies[i]=body;
   }
   const q={x:0,y:0,z:0,w:1};
   const joint=impact.createMultibodyJoint(R.JointData.fixed({x:.65,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[0],bodies[1],true);
   joint.setContactsEnabled(false);
   const damping=impact.multibodyJoints.generalizedDamping(joint.handle)!;
   if(!impact.multibodyJoints.setGeneralizedDamping(joint.handle,damping.fill(0)))throw Error('Coupled damping setup failed');
   for(let step=0;step<15;step++){
    impact.step();const velocity=bodies.map(b=>b.linvel().x);
    const convergence=impact.contactConvergence();
    if(!convergence||Object.values(convergence).some(v=>!Number.isFinite(v)||v<0))throw Error('Missing or invalid convergence counters');
    if(step===0){
     if(convergence.compressionSolves<1||convergence.compressionIterations<1)throw Error('Expected measured adaptive compression');
     if(restitution>0&&(convergence.restitutionSolves<1||convergence.restitutionIterations<1))throw Error('Expected measured adaptive restitution');
     const snapshot=impact.takeSnapshot();convergence.compressionIterations=-1;
     if(impact.contactConvergence()!.compressionIterations<0)throw Error('Convergence result aliases native state');
     const restored=R.World.restoreSnapshot(snapshot);
     try{if(restored.contactConvergence()!==null)throw Error('Restored profiling data must be unavailable');}finally{restored.free();}
    }
    const error=Math.max(...velocity.map((v,i)=>Math.abs(v-[0,0,-4*restitution,4*restitution][i]!)));
    const energy=velocity.reduce((sum,v,i)=>sum+.5*specs[i]![1]!*v*v,0);
    coupledMaximumVelocityError=Math.max(coupledMaximumVelocityError,error);
    coupledMaximumEnergyError=Math.max(coupledMaximumEnergyError,Math.abs(energy-320*restitution**2));
    if(error>=.001||Math.abs(energy-320*restitution**2)>=.001)throw Error('Coupled collision failed browser invariants');
   }
   coupledCases++;
  }finally{impact.free();}
 }
 const {w,a,b}=fixture(R);
 try {
  if(w.ccdSubsteps()!==null)throw Error('Unprofiled CCD count must be unavailable');
  w.profilerEnabled=true;let maximumCcdSubsteps=0,totalCcdMs=0,totalToiMs=0;
  for(let i=0;i<650;i++){w.step();const count=w.ccdSubsteps();if(count===null||!Number.isInteger(count)||count<0||count>4)throw Error('Invalid fresh CCD count');maximumCcdSubsteps=Math.max(maximumCcdSubsteps,count);const total=w.timingCcd(),toi=w.timingCcdToiComputation();if(total+1e-6<toi)throw Error("CCD timing does not cover TOI");totalCcdMs+=total;totalToiMs+=toi;}
  if(!(totalCcdMs>0&&totalToiMs>0))throw Error('Active CCD timing was not recorded');
  if(maximumCcdSubsteps<1)throw Error('Expected CCD activation');
  const fast=new R.World({x:0,y:0,z:0});let fastCcdSubsteps;
  try {fast.timestep=1/60;fast.integrationParameters.maxCcdSubsteps=4;fast.profilerEnabled=true;fast.createCollider(R.ColliderDesc.cuboid(.01,2,2));const body=fast.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-1,0,0).setLinvel(120,0,0).setCcdEnabled(true));fast.createCollider(R.ColliderDesc.ball(.1),body);fast.step();fastCcdSubsteps=fast.ccdSubsteps();if(fastCcdSubsteps!==2)throw Error('Expected two actual CCD passes');}finally{fast.free();}
  w.profilerEnabled=false;if(w.ccdSubsteps()!==null)throw Error('Disabled counter must be unavailable');
  let original=0,solver=0,points=0;
  w.contactPair(a,b,m=>{original+=m.numSolverContacts();});
  w.solverContactPair(a,b,m=>{solver+=m.numSolverContacts();for(let i=0;i<m.numSolverContacts();i++){const p=m.solverContactPoint(i);const p1=m.solverContactPoint1(i),p2=m.solverContactPoint2(i),live=m.solverContactSeparation(i);if(!p||!p1||!p2||live===null||![p.x,p.y,p.z,p1.x,p1.y,p1.z,p2.x,p2.y,p2.z,live,m.solverContactDist(i)].every(Number.isFinite))throw Error('Invalid live solver point');points++;}});
  if(original!==0||solver===0)throw Error('Cluster fixture did not distinguish query sources');
  if(w.integrationParameters.contactClustering!==true)throw Error('Default clustering changed');
  w.integrationParameters.contactClustering=false;
  if(w.integrationParameters.contactClustering!==false)throw Error('Clustering control did not apply');
  w.integrationParameters.minCcdDt=1/960/100;
  if(Math.abs(w.integrationParameters.minCcdDt-1/960/100)>1e-10)throw Error('CCD minimum setter failed');
  if(w.integrationParameters.contactRecycling!==true||w.integrationParameters.warmstartCoefficient!==1)throw Error('Contact policy defaults changed');
  w.integrationParameters.contactRecycling=false;
  w.integrationParameters.normalizedContactRecycleDistance=.001;
  w.integrationParameters.warmstartCoefficient=.5;
  const restored=R.World.restoreSnapshot(w.takeSnapshot());
  try { if(restored.integrationParameters.contactRecycling!==false||Math.abs(restored.integrationParameters.normalizedContactRecycleDistance-.001)>1e-8||restored.integrationParameters.warmstartCoefficient!==.5)throw Error('Contact policy snapshot mismatch');if(restored.getCollider(0).parent()!==null)throw Error('Restored floor aliases body zero');if(restored.getCollider(a.handle).parent()?.handle!==a.parent()?.handle)throw Error('Restored moving owner changed'); } finally {restored.free();}
  const freshWorld=new R.World({x:0,y:0,z:0});
  try {
   const fixed=freshWorld.createCollider(R.ColliderDesc.ball(1));
   const body=freshWorld.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,1.8,0));
   const moving=freshWorld.createCollider(R.ColliderDesc.ball(1),body);
   body.setTranslation({x:0,y:3,z:0},true);
   const before=freshWorld.takeSnapshot();
   if(fixed.contactColliderAtCurrentBodyPoses(moving)!==null)throw Error('Fresh body pose was ignored');
   const hit=fixed.contactColliderAtCurrentBodyPoses(moving,1.1);
   if(!hit||Math.abs(hit.distance-1)>1e-5)throw Error('Fresh prediction failed');
   const after=freshWorld.takeSnapshot();
   if(before.length!==after.length||before.some((v,i)=>v!==after[i]))throw Error('Fresh query changed snapshot');
  }finally{freshWorld.free();}
  const pathWorld=new R.World({x:0,y:0,z:0});let kinematicPositionErrorM=0,kinematicRotationErrorRad=0;
  try {
   pathWorld.timestep=1/60;pathWorld.numSolverIterations=1;pathWorld.integrationParameters.maxCcdSubsteps=0;
   const body=pathWorld.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setLinvel(3,0,0).setAngvel({x:0,y:0,z:30}));pathWorld.createCollider(R.ColliderDesc.ball(.1),body);
   for(let i=0;i<30;i++)pathWorld.step();const p=body.translation(),q=body.rotation();
   kinematicPositionErrorM=Math.hypot(p.x-1.5,p.y,p.z);
   const alignment=Math.abs(q.z*Math.sin(7.5)+q.w*Math.cos(7.5))/Math.hypot(q.x,q.y,q.z,q.w);
   kinematicRotationErrorRad=2*Math.acos(Math.min(1,alignment));
   if(kinematicPositionErrorM>3e-6||kinematicRotationErrorRad>2e-6)throw Error('Prescribed kinematic path drifted');
  }finally{pathWorld.free();}
  let multibodyMomentumError=0,multibodyRigidVelocityError=0;
  for(const offset of [0,.15]){
   const assembly=new R.World({x:0,y:0,z:0});
   try{
    assembly.timestep=1/60;
    const masses=[2,3,5],bs=[];
    for(let i=0;i<3;i++){
     const rb=assembly.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i*.65,i===2?offset:0,0).setLinvel(i===2?-4:0,0,0).setCanSleep(false).setCcdEnabled(true));
     assembly.createCollider(R.ColliderDesc.ball(.25).setMass(masses[i]).setFriction(0).setRestitution(1),rb);bs.push(rb);
    }
    const q={x:0,y:0,z:0,w:1};
    const articulationJoint=assembly.createMultibodyJoint(R.JointData.fixed({x:.65,y:0,z:0},q,{x:0,y:0,z:0},q),bs[0],bs[1],true);
    articulationJoint.setContactsEnabled(false);
    const defaults=assembly.multibodyJoints.generalizedDamping(articulationJoint.handle);
    if(!defaults||defaults.length!==6||defaults[5]!==Math.fround(.1))throw Error('Missing native damping defaults');
    const dampingWorld=R.World.restoreSnapshot(assembly.takeSnapshot());
    try {
     if(!dampingWorld.multibodyJoints.setGeneralizedDamping(articulationJoint.handle,new Float32Array(6)))throw Error('Damping update rejected');
     if(dampingWorld.multibodyJoints.setGeneralizedDamping(articulationJoint.handle,Array(6).fill(NaN)))throw Error('Invalid damping accepted');
     dampingWorld.step();
     if([...dampingWorld.multibodyJoints.generalizedDamping(articulationJoint.handle)!].some(v=>v!==0))throw Error('Explicit damping not retained');
     if(assembly.multibodyJoints.generalizedDamping(articulationJoint.handle)![5]!==Math.fround(.1))throw Error('Damping leaked between worlds');
    }finally{dampingWorld.free();}
    for(let i=0;i<30;i++){
     assembly.step();
     if(offset===0)multibodyMomentumError=Math.max(multibodyMomentumError,Math.abs(bs.reduce((p,b,i)=>p+masses[i]*b.linvel().x,0)+20));
     const ca=bs[0].worldCom(),cb=bs[1].worldCom(),va=bs[0].linvel(),vb=bs[1].linvel(),w=bs[0].angvel();
     const dx=cb.x-ca.x,dy=cb.y-ca.y,dz=cb.z-ca.z;
     multibodyRigidVelocityError=Math.max(multibodyRigidVelocityError,Math.hypot(vb.x-va.x-w.y*dz+w.z*dy,vb.y-va.y-w.z*dx+w.x*dz,vb.z-va.z-w.x*dy+w.y*dx));
    }
   }finally{assembly.free();}
  }
  if(multibodyMomentumError>2e-4||multibodyRigidVelocityError>3e-5)throw Error('Articulated velocity writeback failed');
  if(buildInfo.wasmSha256!==R.buildInfo.wasmSha256||!Object.isFrozen(buildInfo))throw Error('Browser build identity mismatch');
  const sampledWorld = new R.World({x:0,y:-9.81,z:0});
  let boundedStepProfile;
  try {
   const body = sampledWorld.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,2,0));
   sampledWorld.createCollider(R.ColliderDesc.ball(.25), body);
   const control = R.World.restoreSnapshot(sampledWorld.takeSnapshot());
   try {
    const profiler = R.createPhysicsStepProfiler(sampledWorld,{sampleEvery:2,maxSamples:3});
    for(let i=0;i<10;i++){profiler.step();control.step();}
    boundedStepProfile=profiler.snapshot();
    if(boundedStepProfile.completedSteps!==10||boundedStepProfile.samples.length!==3||boundedStepProfile.samplesOmittedForBudget!==2||boundedStepProfile.captureErrors||boundedStepProfile.timingErrors||sampledWorld.profilerEnabled)throw Error('Invalid browser step profile');
    if(boundedStepProfile.samples.some(s=>s.captureStatus!=='captured'||!s.native))throw Error('Missing native browser sample');
    if(boundedStepProfile.samples.some(s=>s.native?.freeRotation.acceptedSteps!==sampledWorld.numSolverIterations))throw Error('Missing browser free rotation observations');
    const ownedProfile=profiler.snapshot();
    ownedProfile.samples[0]!.native!.freeRotation.acceptedSteps=-1;
    if(profiler.snapshot().samples[0]!.native!.freeRotation.acceptedSteps<0)throw Error('Browser free rotation observations are not owned');
    const expected=control.takeSnapshot(),actual=sampledWorld.takeSnapshot();
    if(expected.length!==actual.length||expected.some((v,i)=>v!==actual[i]))throw Error('Browser profiling changed physics');
   }finally{control.free();}
  }finally{sampledWorld.free();}
  let inertiaReconstructionError = 0;
  const inertiaWorld = new R.World({x:0,y:0,z:0});
  try {
   const length = .001, radius = .0001;
   inertiaWorld.lengthUnit = length;
   const body = inertiaWorld.createRigidBody(R.RigidBodyDesc.dynamic());
   inertiaWorld.createCollider(R.ColliderDesc.ball(radius).setMass(1),body);
   inertiaWorld.createCollider(R.ColliderDesc.ball(radius).setTranslation(length,length,length).setMass(1),body);
   body.recomputeMassPropertiesFromColliders();
   const frame = body.principalInertiaLocalFrame(), q = unit([frame.x,frame.y,frame.z,frame.w]);
   const axes = ([[1,0,0],[0,1,0],[0,0,1]] as V[]).map(v=>rotate(q,v));
   const principal = vector(body.principalInertia());
   const expected = Array.from({length:9},(_,i)=>i%4===0?length*length+.8*radius*radius:-.5*length*length);
   const actual = expected.map((_,i)=>axes.reduce((sum,a,k)=>sum+principal[k]*a[Math.floor(i/3)]*a[i%3],0));
   inertiaReconstructionError = Math.hypot(...actual.map((v,i)=>v-expected[i]))/Math.hypot(...expected);
   if(!Number.isFinite(inertiaReconstructionError)||inertiaReconstructionError>3e-6)throw Error('Browser compound inertia reconstruction failed');
  } finally {inertiaWorld.free();}
  // Equivalent authored origins must not change physical assembly motion.
  const originWorlds = [new R.World({x:0,y:0,z:0}), new R.World({x:0,y:0,z:0})];
  let rootOriginError = 0, assemblyAcceptedSteps = 0;
  try {
   const pairs = originWorlds.map((world,index)=>{
    const zero={x:0,y:0,z:0}, q={...zero,w:1}, offset={x:index*.7,y:-index*.3,z:index*.2};
    world.timestep=1/120;world.numSolverIterations=4;
    const a=world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(-offset.x,-offset.y,-offset.z).setAdditionalMassProperties(2,offset,{x:.4,y:.4,z:.4},q));
    const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(1,0,0).setAdditionalMassProperties(1,zero,{x:.2,y:.2,z:.2},q));
    const joint=world.createMultibodyJoint(R.JointData.fixed({x:1+offset.x,y:offset.y,z:offset.z},q,zero,q),a,b,true);
    if(!world.multibodyJoints.setGeneralizedDamping(joint.handle,new Float32Array(6)))throw Error('Origin fixture damping rejected');
    world.step();a.addTorque({x:36,y:-24,z:48},true);world.step();a.resetTorques(true);
    world.profilerEnabled=true;
    if(world.freeAssemblyStats()!==null)throw Error('Assembly counters must be stale before a profiled step');
    return [a,b];
   });
   for(let step=0;step<120;step++){
    for(const world of originWorlds){
     world.step();
     const stats=world.freeAssemblyStats();
     if(stats?.acceptedSteps!==4||stats.nonphysicalInertiaRejections!==0||stats.rotationLimitRejections!==0||stats.invalidOrFailedSolves!==0)throw Error('Missing browser assembly observations');
     assemblyAcceptedSteps+=stats.acceptedSteps;
     stats.acceptedSteps=-1;
     if(world.freeAssemblyStats()?.acceptedSteps!==4)throw Error('Assembly observations are not owned');
    }
    for(let i=0;i<2;i++){
     const a=pairs[0][i].worldCom(),b=pairs[1][i].worldCom();
     rootOriginError=Math.max(rootOriginError,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));
    }
   }
   if(!Number.isFinite(rootOriginError)||rootOriginError>5e-5)throw Error('Floating-root origin changes browser motion');
  }finally{for(const world of originWorlds)world.free();}
  const splitWorld=new R.World({x:0,y:0,z:0});
  let splitReplay:R.World|undefined,splitMaximumMomentumError=0,splitExactReplaySteps=0;
  try {
   splitWorld.timestep=1/120;splitWorld.numSolverIterations=4;
   splitWorld.integrationParameters.maxCcdSubsteps=0;
   const q={x:0,y:0,z:0,w:1};
   const bodies=Array.from({length:4},(_,i)=>{
    const m=i+1;
    return splitWorld.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false).setTranslation(i,0,0)
     .setAdditionalMassProperties(m,{x:.1*m,y:.05*m,z:-.02*m},{x:.2*m,y:.2*m,z:.2*m},q));
   });
   const joints=bodies.slice(1).map((b,i)=>splitWorld.createMultibodyJoint(R.JointData.fixed({x:1,y:0,z:0},q,{x:0,y:0,z:0},q),bodies[i],b,true));
   if(!splitWorld.multibodyJoints.setGeneralizedDamping(joints[0].handle,new Float32Array(6)))throw Error('Split fixture damping failed');
   splitWorld.step();bodies[0].addForce({x:30,y:-20,z:10},true);bodies[0].addTorque({x:120,y:-80,z:160},true);
   splitWorld.step();bodies[0].resetForces(true);bodies[0].resetTorques(true);
   for(let i=0;i<24;i++)splitWorld.step();
   const momentum=()=>bodies.reduce((sum,b)=>{const v=b.linvel(),m=b.mass();return {x:sum.x+m*v.x,y:sum.y+m*v.y,z:sum.z+m*v.z};},{x:0,y:0,z:0});
   const initial=momentum();
   if(Math.hypot(initial.x,initial.y,initial.z)<.01)throw Error('Split fixture has no motion');
   splitWorld.removeMultibodyJoint(joints[1],true);
   splitReplay=R.World.restoreSnapshot(splitWorld.takeSnapshot());splitWorld.profilerEnabled=true;
   for(let i=0;i<32;i++){
    splitWorld.step();splitReplay.step();
    const a=splitWorld.takeSnapshot(),b=splitReplay.takeSnapshot();
    if(a.length!==b.length||a.some((v,index)=>v!==b[index]))throw Error('Browser partial split replay diverged');
    splitExactReplaySteps++;
    const p=momentum();splitMaximumMomentumError=Math.max(splitMaximumMomentumError,Math.hypot(p.x-initial.x,p.y-initial.y,p.z-initial.z));
    if(splitWorld.freeAssemblyStats()?.acceptedSteps!==8)throw Error('Released assemblies did not integrate');
   }
   if(!Number.isFinite(splitMaximumMomentumError)||splitMaximumMomentumError>1e-4)throw Error('Partial split lost browser momentum');
  }finally{splitReplay?.free();splitWorld.free();}
  let wakeExactReplaySteps=0;
  const wake=wakeFixture('multibody',32,R);let wakeReplay:R.World|undefined;
  try {
   wake.releaseSleeping();const before=wake.world.takeSnapshot();
   wakeReplay=R.World.restoreSnapshot(before);
   if(!equalSnapshot(before,wakeReplay.takeSnapshot()))throw Error('Browser pending wake roundtrip differs');
   for(let i=0;i<8;i++){
    wake.world.step();wakeReplay.step();
    if(!equalSnapshot(wake.world.takeSnapshot(),wakeReplay.takeSnapshot()))throw Error('Browser sleeping wake replay differs');
    wakeExactReplaySteps++;
   }
  }finally{wakeReplay?.free();wake.world.free();}
  const predictiveReplays=[];
  for(const [path,first,second,expectedHash] of [
   ['/predictive-floor.bin',0,1.5e-323,'a28c6cd9cc88698198c79aca241340d34b524f3f6e114afb740386b4444db348'],
   ['/predictive-fragment.bin',5e-324,1e-323,'24e38c4e30ce37b069d5e9183353e3dd02347cbad02b0ede9a5a4c9270c97af5']
  ] as const){
   const response=await fetch(path);if(!response.ok)throw Error('Predictive fixture unavailable');
   const bytes=new Uint8Array(await response.arrayBuffer());
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   if(digest!==expectedHash)throw Error('Predictive fixture identity mismatch');
   predictiveReplays.push(qualifyPredictiveReplay(bytes,first,second,R));
  }
  postMessage({predictiveReplays,wakeExactReplaySteps,splitMaximumMomentumError,splitExactReplaySteps,assemblyAcceptedSteps,rootOriginError,inertiaReconstructionError,boundedStepProfile,buildInfo,contactConvergenceControls:true,coupledCases,coupledMaximumEnergyError,coupledMaximumVelocityError,generalizedDampingControls:true,multibodyMomentumError,multibodyRigidVelocityError,simplexMinimumDistanceCm,kinematicPositionErrorM,kinematicRotationErrorRad,currentBodyPoseQuery:true,totalCcdMs,totalToiMs,maximumCcdSubsteps,fastCcdSubsteps,restoredOwners:true,contactPolicyControls:true,passed:true,version:R.version(),original,solver,points,liveAnchors:true,clusteringControl:true,ccdMinimumControl:true});
 }finally{w.free();}
}catch(error){postMessage({passed:false,error:String(error)});}
