import R from '../../dist/rapier.mjs';
import {fixture} from '../tests/fixture';
try {
 await Promise.all([R.init(),R.init()]);
 const {w,a,b}=fixture(R);
 try {
  if(w.ccdSubsteps()!==null)throw Error('Unprofiled CCD count must be unavailable');
  w.profilerEnabled=true;let maximumCcdSubsteps=0,totalCcdMs=0,totalToiMs=0;
  for(let i=0;i<650;i++){w.step();const count=w.ccdSubsteps();if(count===null||!Number.isInteger(count)||count<0||count>4)throw Error('Invalid fresh CCD count');maximumCcdSubsteps=Math.max(maximumCcdSubsteps,count);const total=w.timingCcd(),toi=w.timingCcdToiComputation();if(total+1e-6<toi)throw Error("CCD timing does not cover TOI");totalCcdMs+=total;totalToiMs+=toi;}
  if(!(totalCcdMs>0&&totalToiMs>0))throw Error('Active CCD timing was not recorded');
  if(maximumCcdSubsteps<1)throw Error('Expected CCD activation');
  const fast=new R.World({x:0,y:0,z:0});let fastCcdSubsteps;
  try {fast.timestep=1/60;fast.integrationParameters.maxCcdSubsteps=4;fast.profilerEnabled=true;fast.createCollider(R.ColliderDesc.cuboid(.01,2,2));const body=fast.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-1,0,0).setLinvel(120,0,0).setCcdEnabled(true));fast.createCollider(R.ColliderDesc.ball(.1),body);fast.step();fastCcdSubsteps=fast.ccdSubsteps();if(fastCcdSubsteps!==2)throw Error('Expected two actual CCD passes');}finally{fast.free();}
  const traced=new R.World({x:0,y:0,z:0});let traceRows=0,traceImpactRows=0;
  try {
   if(traced.stepTraceEnabled!==false||traced.stepTrace()!==null)throw Error('Trace must default off');
   traced.timestep=1/60;traced.integrationParameters.maxCcdSubsteps=1;
   traced.createCollider(R.ColliderDesc.cuboid(.01,2,2));
   const moving=traced.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-1,0,0).setLinvel(120,0,0).setCcdEnabled(true));
   traced.createCollider(R.ColliderDesc.ball(.1),moving);
   const snapshot=traced.takeSnapshot();
   const untraced=R.World.restoreSnapshot(snapshot);
   try {
    traced.stepTraceEnabled=true;traced.step();untraced.step();
    const record=traced.stepTrace();
    if(!record||record.schemaVersion!==1||record.stride!==27||record.impactStride!==7||record.truncated||!record.data.length||!record.impacts.length)throw Error('Invalid browser phase trace');
    if(!Array.from(record.data).every(Number.isFinite)||!Array.from(record.impacts).every(Number.isFinite))throw Error('Nonfinite trace');
    if(JSON.stringify(moving.translation())!==JSON.stringify(untraced.getRigidBody(moving.handle).translation()))throw Error('Trace changed motion');
    traceRows=record.data.length/27;traceImpactRows=record.impacts.length/7;
    const first=record.data[0];record.data[0]=999;
    if(traced.stepTrace()?.data[0]!==first)throw Error('Trace arrays alias native storage');
    const restoredTrace=R.World.restoreSnapshot(traced.takeSnapshot());
    try {if(restoredTrace.stepTraceEnabled||restoredTrace.stepTrace()!==null)throw Error('Trace leaked into snapshot');} finally {restoredTrace.free();}
    traced.stepTraceEnabled=false;if(traced.stepTrace()!==null)throw Error('Disabling trace did not clear it');
   }finally{untraced.free();}
  }finally{traced.free();}
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
  const restored=R.World.restoreSnapshot(w.takeSnapshot());
  try { if(restored.getCollider(0).parent()!==null)throw Error('Restored floor aliases body zero');if(restored.getCollider(a.handle).parent()?.handle!==a.parent()?.handle)throw Error('Restored moving owner changed'); } finally {restored.free();}
  postMessage({traceRows,traceImpactRows,traceOwnedArrays:true,traceSnapshotIsolation:true,totalCcdMs,totalToiMs,maximumCcdSubsteps,fastCcdSubsteps,restoredOwners:true,passed:true,version:R.version(),original,solver,points,liveAnchors:true,clusteringControl:true,ccdMinimumControl:true});
 }finally{w.free();}
}catch(error){postMessage({passed:false,error:String(error)});}
