/** Bounded CPU-only moving-normal fixture; analytic sphere/box separation oracle. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const engine=resolve(process.argv[2]??'dist/rapier.mjs'),output=process.argv[3];
if(!output)throw Error('Explicit output path required');
const R=(await import(pathToFileURL(engine).href)).default;await R.init();
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
// Inverse quaternion transform, then exact axis-aligned box signed distance.
function separation(p:{x:number;y:number;z:number},q:{x:number;y:number;z:number;w:number},span=2) {
 const tx=2*(-q.y*p.z+q.z*p.y),ty=2*(-q.z*p.x+q.x*p.z),tz=2*(-q.x*p.y+q.y*p.x);
 const local=[p.x+q.w*tx-q.y*tz+q.z*ty,p.y+q.w*ty-q.z*tx+q.x*tz,p.z+q.w*tz-q.x*ty+q.y*tx];
 const d=local.map((x,i)=>Math.abs(x)-[span,.05,.5][i]!);
 return Math.hypot(...d.map(x=>Math.max(x,0)))+Math.min(Math.max(...d),0)-.1;
}
// Analytic oracle checks: face, interior, edge, rotated face.
const identity={x:0,y:0,z:0,w:1};
for(const [p,q,expected] of [
 [{x:1,y:.15,z:0},identity,0],
 [{x:0,y:0,z:0},identity,-.15],
 [{x:2.1,y:.15,z:0},identity,Math.sqrt(.02)-.1],
 [{x:-.15,y:1,z:0},{x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2},0]
] as const)if(Math.abs(separation(p,q)-expected)>1e-12)throw Error('Analytic oracle failed');
const fullDuration=process.argv.includes('--full-duration'),narrowOnly=process.argv.includes('--narrow-only'),queryFresh=!process.argv.includes('--no-fresh-query');
const noWarmstart=process.argv.includes('--no-warmstart'), boxOracle=process.argv.includes('--box-oracle');
const startFeature=process.argv.find(v=>v.startsWith('--start='))?.split('=')[1]??'face';
if(!['face','edge','corner'].includes(startFeature))throw Error('Unsupported start feature');
const noCcd=process.argv.includes('--no-ccd');
const commonBoost=process.argv.includes('--common-boost');
const boost=commonBoost?{x:3,y:-2,z:1}:{x:0,y:0,z:0};
const rotationAxis=process.argv.find(v=>v.startsWith('--axis='))?.split('=')[1]??'z';
if(!['z','oblique'].includes(rotationAxis))throw Error('Unsupported rotation axis');
const axis=rotationAxis==='z'?{x:0,y:0,z:1}:{x:1/Math.sqrt(14),y:2/Math.sqrt(14),z:3/Math.sqrt(14)};
const planeOracle=process.argv.includes('--plane-oracle'), broadOnly=process.argv.includes('--broad-only');
if(planeOracle&&boxOracle)throw Error('Choose only one research oracle');
if(planeOracle&&(!broadOnly||startFeature!=='face'))throw Error('Plane oracle requires broad-only face fixture');
const solverBudget=Number(process.argv.find(v=>v.startsWith('--solver-substeps='))?.split('=')[1]??32);
if(![8,16,32,64,128].includes(solverBudget))throw Error('Unsupported solver subdivision budget');
const subdivisions=Number(process.argv.find(v=>v.startsWith('--subdivisions='))?.split('=')[1]??1);
if(![1,2,4,8,16,32].includes(subdivisions)||solverBudget%subdivisions!==0)throw Error('Unsupported subdivision count');
const cases=[];const started=performance.now();
for(const span of (broadOnly?[20]:narrowOnly?[2]:[2,20]))for(const hz of [60,240,960])for(const omega of [0,6,-6,30,-30])for(const reverse of [false,true]) {
 if(performance.now()-started>20000)throw Error('Probe exceeded 20s work budget');
 const w=new R.World({x:0,y:0,z:0});
 try {
  w.timestep=1/(hz*subdivisions);w.numSolverIterations=solverBudget/subdivisions;w.integrationParameters.maxCcdSubsteps=4;
  w.integrationParameters.minCcdDt=w.timestep/100;
  w.integrationParameters.normalizedAllowedLinearError=.00001;
  w.integrationParameters.contact_natural_frequency=960;
  if(noWarmstart)w.integrationParameters.warmstartCoefficient=0;
  const platform=()=>{const b=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setLinvel(boost.x,boost.y,boost.z).setAngvel({x:axis.x*omega,y:axis.y*omega,z:axis.z*omega}).setCcdEnabled(!noCcd));w.createCollider(R.ColliderDesc.cuboid(span,.05,.5).setFriction(0).setRestitution(0),b);return b;};
  const clearance=.10001;
  const start=startFeature==='face'?{x:1,y:.05+clearance,z:0}:startFeature==='edge'?{x:span+clearance/Math.SQRT2,y:.05+clearance/Math.SQRT2,z:0}:{x:span+clearance/Math.sqrt(3),y:.05+clearance/Math.sqrt(3),z:.5+clearance/Math.sqrt(3)};
  const sphere=()=>{const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(start.x,start.y,start.z).setLinvel(boost.x,boost.y,boost.z).setCcdEnabled(!noCcd));w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b);return b;};
  const first=reverse?sphere():platform(),second=reverse?platform():sphere();
  const support=reverse?second:first,body=reverse?first:second;
  if(planeOracle||boxOracle) {w.bodies.raw.rbSetUserData(support.handle,planeOracle?0x41505031:span===20?0x41504214:0x41504202);w.bodies.raw.rbSetUserData(body.handle,0x41505331);}
  const frames=[];let maxPathError=0,maxTranslationPathError=0;
  const steps=Math.floor(hz*Math.min(.25,fullDuration||omega===0?.25:1.5/Math.abs(omega)));
  for(let frame=0;frame<steps;frame++) {
   for(let inner=0;inner<subdivisions;inner++)w.step();const p=body.translation(),supportPosition=support.translation(),q=support.rotation();const theta=omega*(frame+1)/hz;
   const pathError=Math.abs(1-Math.abs((q.x*axis.x+q.y*axis.y+q.z*axis.z)*Math.sin(theta/2)+q.w*Math.cos(theta/2)));maxPathError=Math.max(maxPathError,pathError);
   const elapsed=(frame+1)/hz;
   maxTranslationPathError=Math.max(maxTranslationPathError,Math.hypot(supportPosition.x-boost.x*elapsed,supportPosition.y-boost.y*elapsed,supportPosition.z-boost.z*elapsed));
   const sep=separation({x:p.x-supportPosition.x,y:p.y-supportPosition.y,z:p.z-supportPosition.z},q,span);if(!Number.isFinite(sep))throw Error('Nonfinite physical state');
   const fresh=queryFresh?support.collider(0).contactCollider(body.collider(0),.5):null;
   if(queryFresh&&sep<.49&&(!fresh||Math.abs(fresh.distance-sep)>1e-4))throw Error('Fresh native contact disagrees with analytic oracle');
   let contacts=0,maxLiveDepth=0,maxCachedDepth=0,maxNormalAngle=0;
   w.solverContactPair(support.collider(0),body.collider(0),(m:any)=>{
    if(!m.numSolverContacts())return;
    const n=m.normal(),face={x:2*(q.x*q.y-q.z*q.w),y:1-2*(q.x*q.x+q.z*q.z),z:2*(q.y*q.z+q.x*q.w)};
    maxNormalAngle=Math.max(maxNormalAngle,Math.acos(Math.min(1,Math.abs(n.x*face.x+n.y*face.y+n.z*face.z))));
    for(let i=0;i<m.numSolverContacts();i++) {
     contacts++;maxLiveDepth=Math.max(maxLiveDepth,-m.solverContactSeparation(i));maxCachedDepth=Math.max(maxCachedDepth,-m.solverContactDist(i));
    }
   });
   frames.push({frame,freshDistance:fresh?.distance??null,freshNormal:fresh?.normal1??null,position:p,velocity:body.linvel(),sphereAngularVelocity:body.angvel(),sphereRotation:body.rotation(),supportPosition,rotation:q,separation:sep,pathError,contacts,maxLiveDepth,maxCachedDepth,maxNormalAngle});
  }
  const peak=frames.reduce((a,b)=>a.separation<b.separation?a:b);
  cases.push({span,hz,omega,reverse,steps,maxPathError,maxTranslationPathError,peak,frames});
 }finally{w.free();}
}
const result={noCcd,commonBoost,rotationAxis,startFeature,boxOracle,noWarmstart,planeOracle,broadOnly,subdivisions,solverSubdivisionsPerOuterInterval:solverBudget,fullDuration,narrowOnly,queryFresh,candidateOnly:true,physicalAcceptance:false,engineSha256:hash(engine),sourceSha256:hash(import.meta.path),scope:'Rotating kinematic cuboid and free dynamic sphere, exact signed-distance oracle, friction/restitution zero. Negative separation is penetration. Static support is the control. Driven energy is not conserved. Default motion is limited to 1.5 radians and 0.25s to avoid late speed-cap confounding; fullDuration is explicitly exploratory. Fresh native shape queries are checked against the independent oracle. Reported manifold-normal angle is an outer-step observation, not an internal Jacobian trace.',cases,elapsedMs:performance.now()-started};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(cases.map(({span,hz,omega,reverse,peak,maxPathError})=>({span,hz,omega,reverse,penetration:Math.max(0,-peak.separation),maxPathError})));
if(cases.some(c=>c.maxPathError>1e-5||c.maxTranslationPathError>1e-4||(c.omega===0&&c.peak.separation<-.00002)))throw Error('Prescribed path or static control failed');
