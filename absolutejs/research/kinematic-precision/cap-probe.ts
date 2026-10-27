import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const engine=resolve(process.argv[2]!),output=process.argv[3];if(!output)throw Error('Output required');
const R=(await import(pathToFileURL(engine).href)).default;await R.init();const rows=[];
for(const budget of [1,4,32,128])for(const sign of [-1,1]){
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.numSolverIterations=budget;w.integrationParameters.maxCcdSubsteps=0;
  const b=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setLinvel(500*sign,0,0).setAngvel({x:0,y:0,z:200*sign}));w.createCollider(R.ColliderDesc.ball(.1),b);
  w.step();const v=b.linvel(),a=b.angvel(),p=b.translation(),q=b.rotation();
  const linearSpeed=Math.hypot(v.x,v.y,v.z),angularSpeed=Math.hypot(a.x,a.y,a.z);
  if(Math.abs(linearSpeed-400)>1e-3||Math.abs(angularSpeed-Math.PI/4*60)>1e-3)throw Error('Existing speed cap changed');
  rows.push({budget,sign,position:p,rotation:q,velocity:v,angularVelocity:a,linearSpeed,angularSpeed});
 }finally{w.free();}
}
writeFileSync(output,JSON.stringify({passed:true,scope:'Existing 400 units/s and quarter-pi-per-step angular caps preserved, both signs. Endpoint precision is reported separately.',engineSha256:createHash('sha256').update(readFileSync(engine)).digest('hex'),sourceSha256:createHash('sha256').update(readFileSync(import.meta.path)).digest('hex'),rows},null,2)+'\n');console.log('Eight cap controls passed');
