import {writeFileSync} from 'node:fs';
const path=process.argv[2]!,output=process.argv[3]!;const {default:R,buildInfo}=await import(path);await R.init();
const indices=Uint32Array.from([0,1,2,0,2,3,0,4,5,0,5,1,1,5,6,1,6,2,3,2,6,3,6,7,0,3,7,0,7,4,4,8,5,5,8,6,6,8,7,7,8,4]);const rows=[];
for(const scale of [.001,1,100,10000]){
 const world=new R.World({x:0,y:0,z:0});try{
 const p=Float32Array.from([-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,1,-1,1,-1,1,1,-1,1,1,1,-1,1,1,0,1.01,0],v=>v*scale);
 const body=world.createRigidBody(R.RigidBodyDesc.dynamic());const c=world.createCollider(R.ColliderDesc.convexMesh(p,indices).setDensity(1/scale**3),body);
 const hit=c.castRayAndGetNormal(new R.Ray({x:.25*scale,y:3*scale,z:0},{x:0,y:-1,z:0}),5*scale,false);
 rows.push({scale,mass:body.mass(),hit,height:hit?(3*scale-hit.timeOfImpact)/scale:null});
 }finally{world.free();}
}
writeFileSync(output,JSON.stringify({buildInfo,rows},null,2)+'\n');console.log(rows.map(r=>({scale:r.scale,mass:r.mass,height:r.height})));
