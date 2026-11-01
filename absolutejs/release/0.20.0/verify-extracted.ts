/** Consume only extracted archive entrypoints, without a workspace package link. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('.absolutejs/archive-consumer-0.20.0/package');
const R=(await import(resolve(root,'dist/rapier.mjs'))).default;
const {buildInfo}=await import(resolve(root,'dist/build-info.mjs'));
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
if(pkg.private||pkg.version!=='0.20.0'||buildInfo.packageVersion!==pkg.version||buildInfo.qualifiedKernelRelease!=='0.20.0')throw Error('Extracted release identity mismatch');
await R.init();const world=new R.World({x:0,y:0,z:0});
try{
 const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false));world.createCollider(R.ColliderDesc.ball(.2),body);world.numSolverIterations=8;
 const profiler=R.createPhysicsStepProfiler(world,{sampleEvery:2,maxSamples:4});for(let i=0;i<10;i++)profiler.step();
 const profile=profiler.snapshot(),packet=R.encodePhysicsStepProfile(profile),decoded=R.decodePhysicsStepProfile(JSON.parse(JSON.stringify(packet)));
 if(JSON.stringify(R.encodePhysicsStepProfile(decoded))!==JSON.stringify(packet)||decoded.completedSteps!==10||decoded.samples.length!==4||decoded.solverSchedules[0]?.minSubsteps!==8)throw Error('Extracted profile transport failed');
 const drag=R.solveQuadraticDragImpulse({relativeSpeed:3,fluidSpeed:4,inverseEffectiveMass:.5,quadraticResistance:2,dt:.25});
 if(Math.abs(drag.impulse+2)>1e-12)throw Error('Inherited drag API failed');
 const archive='absolutejs/release/0.20.0/absolutejs-rapier3d-0.20.0.tgz';
 const report={passed:true,scope:'exact extracted archive; no installed workspace import',buildInfo,archiveSha256:createHash('sha256').update(readFileSync(archive)).digest('hex'),completedSteps:decoded.completedSteps,samples:decoded.samples.length,packetBytes:Buffer.byteLength(JSON.stringify(packet)),schedule:decoded.solverSchedules[0],drag};
 writeFileSync('absolutejs/release/0.20.0/extracted-consumer.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{world.free();}
