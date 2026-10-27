/** Bounded opt-in phase attribution for the remaining tagged sphere/box residual. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const engine=resolve(process.argv[2]!),output=process.argv[3];if(!output)throw Error('Output required');
const solverBudget=Number(process.argv[4]??32);if(![32,128].includes(solverBudget))throw Error('Unsupported phase budget');
const R=(await import(pathToFileURL(engine).href)).default;await R.init();
function sep(p:number[],q:number[]){
 const [x,y,z]=p as [number,number,number], [qx,qy,qz,qw]=q as [number,number,number,number];
 const tx=2*(-qy*z+qz*y),ty=2*(-qz*x+qx*z),tz=2*(-qx*y+qy*x);
 const local=[x+qw*tx-qy*tz+qz*ty,y+qw*ty-qz*tx+qx*tz,z+qw*tz-qx*ty+qy*tx];
 const d=local.map((v,i)=>Math.abs(v)-[20,.05,.5][i]!);
 return Math.hypot(...d.map(v=>Math.max(v,0)))+Math.min(Math.max(...d),0)-.1;
}
const rows=[];let matchedFrames=0;
for(const [hz,omega] of [[60,30],[240,30],[960,6],[960,30]])for(const reverse of [false,true]){
 const w=new R.World({x:0,y:0,z:0});let control:any;
 try{
  w.timestep=1/hz!;w.numSolverIterations=solverBudget;w.integrationParameters.maxCcdSubsteps=4;
  w.integrationParameters.minCcdDt=w.timestep/100;w.integrationParameters.normalizedAllowedLinearError=.00001;w.integrationParameters.contact_natural_frequency=960;
  const plane=()=>{const b=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setAngvel({x:0,y:0,z:omega}).setCcdEnabled(true));w.createCollider(R.ColliderDesc.cuboid(20,.05,.5).setFriction(0).setRestitution(0),b);return b;};
  const sphere=()=>{const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(1,.15001,0).setCcdEnabled(true));w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b);return b;};
  const a=reverse?sphere():plane(),b=reverse?plane():sphere(),support=reverse?b:a,body=reverse?a:b;
  w.bodies.raw.rbSetUserData(support.handle,0x41504214);w.bodies.raw.rbSetUserData(body.handle,0x41505331);
  const handleParts=(h:number)=>{const view=new DataView(new Float64Array([h]).buffer);return [view.getUint32(0,true),view.getUint32(4,true)];};
  const sid=handleParts(support.handle),bid=handleParts(body.handle);
  control=R.World.restoreSnapshot(w.takeSnapshot());w.stepTraceEnabled=true;
  const frames=[];const steps=Math.floor(hz!*Math.min(.25,1.5/Math.abs(omega!)));
  for(let frame=0;frame<steps;frame++){
   w.step();control.step();if(!Buffer.from(w.takeSnapshot()).equals(Buffer.from(control.takeSnapshot())))throw Error('Tracing changed snapshot');matchedFrames++;
   const trace=w.stepTrace();if(!trace||trace.truncated)throw Error('Missing or truncated trace');
   const raw=Array.from({length:trace.data.length/trace.stride},(_,i)=>Array.from(trace.data.slice(i*trace.stride,(i+1)*trace.stride))) as number[][];
   const phases=[];
   for(const sr of raw.filter(r=>r[4]===sid[0]&&r[5]===sid[1])){
    const br=raw.find(r=>r[0]===sr[0]&&r[1]===sr[1]&&r[4]===bid[0]&&r[5]===bid[1]);if(!br)throw Error('Unpaired body phase');
    const next=sr[0]===2||sr[0]===3,po=next?13:6,qo=next?16:9;
    const relative=[0,1,2].map(i=>br[po+i]!-sr[po+i]!);
    phases.push({phase:sr[0],pass:sr[1],dt:sr[2],remaining:sr[3],separationM:sep(relative,sr.slice(qo,qo+4))});
   }
   const p=body.translation(),q=support.rotation(),sp=support.translation();const actual=sep([p.x-sp.x,p.y-sp.y,p.z-sp.z],[q.x,q.y,q.z,q.w]);
   if(Math.abs(phases.filter(p=>p.phase===4).at(-1)!.separationM-actual)>1e-12)throw Error('Final phase geometry disagrees');
   frames.push({frame,separationM:actual,phases,impacts:Array.from(trace.impacts),raw});
  }
  const peak=frames.reduce((a,b)=>a.separationM<b.separationM?a:b);
  rows.push({hz,omega,reverse,steps,peakFrame:peak.frame,peakSeparationM:peak.separationM,peakPhases:peak.phases,peakImpacts:peak.impacts,frames});
 }finally{control?.free();w.free();}
}
writeFileSync(output,JSON.stringify({physicalAcceptance:false,solverBudget,matchedFrames,engineSha256:createHash('sha256').update(readFileSync(engine)).digest('hex'),sourceSha256:createHash('sha256').update(readFileSync(import.meta.path)).digest('hex'),rows},null,2)+'\n');
console.log(rows.map(({frames,...r})=>r));
