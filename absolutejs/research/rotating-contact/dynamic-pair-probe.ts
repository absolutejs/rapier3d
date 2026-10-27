/** PRIVATE bounded sphere/box controls: both bodies react, with no external work. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
type V={x:number;y:number;z:number};type Q=V&{w:number};
const add=(a:V,b:V):V=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:V,b:V):V=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a:V,s:number):V=>({x:a.x*s,y:a.y*s,z:a.z*s});
const dot=(a:V,b:V)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:V,b:V):V=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const norm=(a:V)=>Math.hypot(a.x,a.y,a.z);
function rotate(q:Q,v:V):V{const t=mul(cross(q,v),2);return add(v,add(mul(t,q.w),cross(q,t)));}
function unit(q:Q):Q{const n=Math.hypot(q.x,q.y,q.z,q.w);return {x:q.x/n,y:q.y/n,z:q.z/n,w:q.w/n};}
const inverse=(q:Q):Q=>({x:-q.x,y:-q.y,z:-q.z,w:q.w});
function separation(d:V,q:Q,span:number){const p=rotate(inverse(q),d),a=[Math.abs(p.x)-span,Math.abs(p.y)-.05,Math.abs(p.z)-.5];return Math.hypot(...a.map(v=>Math.max(0,v)))+Math.min(0,Math.max(...a))-.1;}
const engine=resolve(process.argv[2]!),output=process.argv[3];if(!output)throw Error('Engine and output required');
const feature=process.argv.find(v=>v.startsWith('--feature='))?.split('=')[1]??'face';
if(!['face','edge','corner'].includes(feature))throw Error('Unsupported feature');
const oracle=process.argv.includes('--oracle'),boosted=process.argv.includes('--boost');
const separated=process.argv.includes('--separated');
const boost=boosted?{x:3,y:-2,z:1}:{x:0,y:0,z:0};
const R=(await import(pathToFileURL(engine).href)).default;await R.init();
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const rows=[];const started=performance.now();
for(const span of [2,20])for(const hz of [60,240,960])for(const omega of (span===20?[0,6,-6]:[0,6,-6,30,-30]))for(const reverse of [false,true]){
 if(performance.now()-started>20000)throw Error('Dynamic probe exceeded 20s work budget');
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/hz;w.numSolverIterations=32;w.integrationParameters.maxCcdSubsteps=0;
  w.integrationParameters.normalizedAllowedLinearError=.00001;w.integrationParameters.contact_natural_frequency=960;
  const sign=omega<0?-1:1,c=.10001;
  const start=separated?{x:0,y:50,z:0}:feature==='face'?{x:sign,y:.05+c,z:0}:feature==='edge'?{x:sign*(span+c/Math.SQRT2),y:.05+c/Math.SQRT2,z:0}:{x:sign*(span+c/Math.sqrt(3)),y:.05+c/Math.sqrt(3),z:.5+c/Math.sqrt(3)};
  const makeBox=()=>{const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setLinvel(boost.x,boost.y,boost.z).setAngvel({x:0,y:0,z:omega}).setCanSleep(false));w.createCollider(R.ColliderDesc.cuboid(span,.05,.5).setFriction(0).setRestitution(0),b);b.recomputeMassPropertiesFromColliders();return b;};
  const makeSphere=()=>{const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(start.x,start.y,start.z).setLinvel(boost.x,boost.y,boost.z).setCanSleep(false));w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b);b.recomputeMassPropertiesFromColliders();return b;};
  const first=reverse?makeSphere():makeBox(),second=reverse?makeBox():makeSphere();
  const box=reverse?second:first,sphere=reverse?first:second;
  if(oracle){w.bodies.raw.rbSetUserData(box.handle,span===20?0x41504214:0x41504202);w.bodies.raw.rbSetUserData(sphere.handle,0x41505331);}
  const mb=box.mass(),ms=sphere.mass(),total=mb+ms;
  if(Math.abs(mb/(span*.2)-1)>1e-6||Math.abs(ms/(4*Math.PI*.001/3)-1)>1e-6)throw Error('Unexpected centered shape mass');
  const origin=mul(add(mul(box.translation(),mb),mul(sphere.translation(),ms)),1/total);
  const diagonal={x:mb*(.05**2+.5**2)/3,y:mb*(span**2+.5**2)/3,z:mb*(span**2+.05**2)/3};
  const sphereInertia=.4*ms*.1**2;
  function measure(){
   const bp=box.translation(),sp=sphere.translation(),bv=box.linvel(),sv=sphere.linvel(),bw=box.angvel(),sw=sphere.angvel(),q=unit(box.rotation());
   const local=rotate(inverse(q),bw),localL={x:diagonal.x*local.x,y:diagonal.y*local.y,z:diagonal.z*local.z};
   const p=add(mul(bv,mb),mul(sv,ms));
   const angular=add(add(cross(sub(bp,origin),mul(bv,mb)),cross(sub(sp,origin),mul(sv,ms))),add(rotate(q,localL),mul(sw,sphereInertia)));
   const energy=.5*mb*dot(sub(bv,boost),sub(bv,boost))+.5*ms*dot(sub(sv,boost),sub(sv,boost))+.5*dot(local,localL)+.5*sphereInertia*dot(sw,sw);
   const maxLinearSpeed=Math.max(norm(bv),norm(sv)),maxAngularSpeed=Math.max(norm(bw),norm(sw));
   return {bp,sp,bv,sv,bw,sw,rotation:q,sphereRotation:sphere.rotation(),momentum:p,angularMomentum:angular,energy,separation:separation(sub(sp,bp),q,span),maxLinearSpeed,maxAngularSpeed,speedCapConfounded:maxLinearSpeed>=396||maxAngularSpeed>=.99*Math.PI/4*hz};
  }
  const initial=measure(),frames=[];
  const steps=Math.max(1,Math.floor(hz*Math.min(.1,omega===0?.1:1.5/Math.abs(omega))));
  for(let frame=0;frame<steps;frame++){
   w.step();const state=measure();
   if(!Number.isFinite(state.energy)||!Number.isFinite(state.separation))throw Error('Nonfinite physical state');
   const fresh=box.collider(0).contactColliderAtCurrentBodyPoses(sphere.collider(0),.5);
   if(separated&&fresh)throw Error('Separated control unexpectedly has a nearby contact');
   if(state.separation<.49&&(!fresh||Math.abs(fresh.distance-state.separation)>1e-4))throw Error('Fresh geometry disagrees with independent box oracle');
   frames.push({frame,...state,momentumError:norm(sub(state.momentum,initial.momentum)),angularMomentumError:norm(sub(state.angularMomentum,initial.angularMomentum)),energyGain:state.energy-initial.energy,freshDistance:fresh?.distance??null});
  }
  if(omega===0&&frames.some(f=>f.separation<-.00002||Math.abs(f.energy)>1e-9))throw Error('Static physical control failed');
  rows.push({span,hz,omega,reverse,steps,mass:{box:mb,sphere:ms},initial,peakDepthM:Math.max(0,...frames.map(f=>-f.separation)),maxMomentumError:Math.max(...frames.map(f=>f.momentumError)),maxAngularMomentumError:Math.max(...frames.map(f=>f.angularMomentumError)),maxEnergyGain:Math.max(0,...frames.map(f=>f.energyGain)),frames});
 }finally{w.free();}
}
writeFileSync(output,JSON.stringify({physicalAcceptance:false,scope:'Centered finite dynamic box and radius-0.1 dynamic sphere, friction/restitution/gravity zero, CCD disabled, 32 solver subdivisions. Analytic inertias use measured masses; energy is measured in the common-boost frame. No prescribed support or external work. Tagged solver remains private and shape-specific.',engineSha256:hash(engine),sourceSha256:hash(import.meta.path),feature,oracle,boosted,separated,rows,elapsedMs:performance.now()-started},null,2)+'\n');
console.log({cases:rows.length,feature,oracle,peakDepthM:Math.max(...rows.map(r=>r.peakDepthM)),maxMomentumError:Math.max(...rows.map(r=>r.maxMomentumError)),maxAngularMomentumError:Math.max(...rows.map(r=>r.maxAngularMomentumError)),maxEnergyGain:Math.max(...rows.map(r=>r.maxEnergyGain))});
