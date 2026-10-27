/** Explicit initial-overlap recovery: peak initial overlap is intentional, not a pass criterion. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const engine=resolve(process.argv[2]!), output=process.argv[3];
if(!output)throw Error('Engine and durable output path required');
const R=(await import(pathToFileURL(engine).href)).default; await R.init();
const rows=[];
for(const tagged of [false,true])for(const y of [-.02,0,.02])for(const reverse of [false,true]){
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/240;w.numSolverIterations=32;
  w.integrationParameters.normalizedAllowedLinearError=.00001;
  w.integrationParameters.contact_natural_frequency=960;
  const plane=()=>{const b=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased());w.createCollider(R.ColliderDesc.cuboid(2,.05,.5).setFriction(0).setRestitution(0),b);return b;};
  const sphere=()=>{const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,y,0));w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b);return b;};
  const a=reverse?sphere():plane(),b=reverse?plane():sphere(),support=reverse?b:a,body=reverse?a:b;
  if(tagged){w.bodies.raw.rbSetUserData(support.handle,0x41504202);w.bodies.raw.rbSetUserData(body.handle,0x41505331);}
  const frames=[];
  for(let step=0;step<60;step++){
   w.step();const p=body.translation();
   const d=[Math.abs(p.x)-2,Math.abs(p.y)-.05,Math.abs(p.z)-.5];
   const separation=Math.hypot(...d.map(v=>Math.max(0,v)))+Math.min(Math.max(...d),0)-.1;
   if(!Number.isFinite(separation))throw Error('Nonfinite recovery state');
   const fresh=support.collider(0).contactColliderAtCurrentBodyPoses(body.collider(0),.5);
   if(separation<.49&&(!fresh||Math.abs(fresh.distance-separation)>1e-4))throw Error('Recovery geometry oracle mismatch');
   frames.push({step,position:p,velocity:body.linvel(),spin:body.angvel(),separation});
  }
  rows.push({tagged,y,reverse,initialSeparationM:-.15+Math.abs(y),finalSeparationM:frames.at(-1)!.separation,frames});
 }finally{w.free();}
}
writeFileSync(output,JSON.stringify({physicalAcceptance:false,scope:'Intentional initial overlap; stationary prescribed cuboid, centered sphere, both orders. No CCD. Reports recovery history rather than pretending initial penetration is an unexpected collision failure.',engineSha256:createHash('sha256').update(readFileSync(engine)).digest('hex'),sourceSha256:createHash('sha256').update(readFileSync(import.meta.path)).digest('hex'),rows},null,2)+'\n');
console.log(rows.map(({frames,...row})=>row));
