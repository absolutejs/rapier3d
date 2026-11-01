/** Consume only extracted archive entrypoints, without a workspace package link. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import fixture from '../../tests/fixtures/captured-convex-exports.json';
import slender from '../../tests/fixtures/slender-convex-exports.json';
import {certifyConvexBoundary} from '../../tests/convex-export-certificate';
import {createHash} from 'node:crypto';
const root=resolve('.absolutejs/archive-consumer-0.21.0/package');
const R=(await import(resolve(root,'dist/rapier.mjs'))).default;
const {buildInfo}=await import(resolve(root,'dist/build-info.mjs'));
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
if(buildInfo.convexExportPrecision!=='float64')throw Error('Missing convex export identity');
if(pkg.private||pkg.version!=='0.21.0'||buildInfo.packageVersion!==pkg.version||buildInfo.qualifiedKernelRelease!=='0.21.0')throw Error('Extracted release identity mismatch');
await R.init();const world=new R.World({x:0,y:0,z:0});
try{
 let certifiedConvexExports=0;
 for(const f of [...fixture.members,...slender.members]){
  const desc=f.inputIndices?R.ColliderDesc.convexMesh(Float32Array.from(f.inputPositions),Uint32Array.from(f.inputIndices)):R.ColliderDesc.convexHull(Float32Array.from(f.inputPositions));
  if(!desc)throw Error('Archive rejected captured descriptor');
  const c=world.createCollider(desc),before=world.takeSnapshot(),m=c.convexMeshData();
  if(!m)throw Error('Archive lacks atomic convex export');
  certifyConvexBoundary(m.vertices,m.indices,f.positions);
  if(!Buffer.from(before).equals(Buffer.from(world.takeSnapshot())))throw Error('Archive query mutated native world');
  world.removeCollider(c,false);certifiedConvexExports++;
 }
 const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false));world.createCollider(R.ColliderDesc.ball(.2),body);world.numSolverIterations=8;
 const profiler=R.createPhysicsStepProfiler(world,{sampleEvery:2,maxSamples:4});for(let i=0;i<10;i++)profiler.step();
 const profile=profiler.snapshot(),packet=R.encodePhysicsStepProfile(profile),decoded=R.decodePhysicsStepProfile(JSON.parse(JSON.stringify(packet)));
 if(JSON.stringify(R.encodePhysicsStepProfile(decoded))!==JSON.stringify(packet)||decoded.completedSteps!==10||decoded.samples.length!==4||decoded.solverSchedules[0]?.minSubsteps!==8)throw Error('Extracted profile transport failed');
 const drag=R.solveQuadraticDragImpulse({relativeSpeed:3,fluidSpeed:4,inverseEffectiveMass:.5,quadraticResistance:2,dt:.25});
 if(Math.abs(drag.impulse+2)>1e-12)throw Error('Inherited drag API failed');
 const archive='absolutejs/release/0.21.0/absolutejs-rapier3d-0.21.0.tgz';
 const report={passed:true,certifiedConvexExports,scope:'exact extracted archive; no installed workspace import',buildInfo,archiveSha256:createHash('sha256').update(readFileSync(archive)).digest('hex'),completedSteps:decoded.completedSteps,samples:decoded.samples.length,packetBytes:Buffer.byteLength(JSON.stringify(packet)),schedule:decoded.solverSchedules[0],drag};
 writeFileSync('absolutejs/release/0.21.0/extracted-consumer.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{world.free();}
