import {resolve} from 'node:path';
const archiveRoot=resolve('.absolutejs/archive-consumer-0.21.1/package');
const {default:R,buildInfo}=await import(archiveRoot+'/dist/rapier.mjs');
if(buildInfo.packageVersion!=='0.21.1'||buildInfo.wasmSha256!=='1d35b69d746eee6383401a68ec37d051391e0fa321096675b46c86072616e9d5')throw Error('Archive identity mismatch');
await R.init();
const w=new R.World({x:0,y:0,z:0});
try{
 w.timestep=1/480;w.integrationParameters.maxCcdSubsteps=4;
 const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setCcdEnabled(true).setLinvel(100,0,0));
 const hull=R.ColliderDesc.convexHull(new Float32Array([0,0,0,.03,0,0,0,.03,0,0,0,.03]));
 if(!hull)throw Error('Archive convex creation failed');
 w.createCollider(hull,body);
 w.createCollider(R.ColliderDesc.cuboid(.005,100,100).setTranslation(2,0,0));
 for(let i=0;i<240;i++)w.step();
 if(body.translation().x>=2)throw Error('Archive CCD crossed thin wall');
 const snapshot=w.takeSnapshot(),restored=R.World.restoreSnapshot(snapshot);
 try{
  if(JSON.stringify(restored.getRigidBody(body.handle).translation())!==JSON.stringify(body.translation()))throw Error('Archive snapshot changed pose');
 }finally{restored.free();}
 await Bun.write('absolutejs/release/0.21.1/extracted-consumer.json',JSON.stringify({passed:true,scope:'exact extracted archive, CCD thin wall and snapshot pose',buildInfo,position:body.translation()},null,2)+'\n');
}finally{w.free();}
