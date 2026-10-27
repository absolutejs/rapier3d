/** Force-free spinning bodies: analytic principal/isotropic paths and an RK4 Euler reference. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
type V=[number,number,number];type Q=[number,number,number,number];
type Frame={frame:number;w:V;q:Q;angularVelocityError:number;orientationErrorRad:number;relativeMomentumError:number;relativeEnergyError:number;relativeEnergyGain:number;speedCapConfounded:boolean};
const add=(a:V,b:V):V=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale=(a:V,s:number):V=>a.map(x=>x*s) as V;
const dot=(a:V,b:V)=>a.reduce((s,x,i)=>s+x*b[i]!,0);
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=(v:number[])=>Math.hypot(...v);
const unit=(q:Q)=>q.map(v=>v/norm(q)) as Q;
const inverse=(q:Q):Q=>[-q[0],-q[1],-q[2],q[3]];
function product(a:Q,b:Q):Q{const v=add(add(scale(b.slice(0,3) as V,a[3]),scale(a.slice(0,3) as V,b[3])),cross(a.slice(0,3) as V,b.slice(0,3) as V));return [...v,a[3]*b[3]-dot(a.slice(0,3) as V,b.slice(0,3) as V)];}
const rotate=(q:Q,v:V)=>product(product(q,[...v,0]),inverse(q)).slice(0,3) as V;
const vector=(v:{x:number;y:number;z:number}):V=>[v.x,v.y,v.z];
const quaternion=(q:{x:number;y:number;z:number;w:number}):Q=>unit([q.x,q.y,q.z,q.w]);
const angle=(a:Q,b:Q)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,i)=>s+x*b[i]!,0))));
const multiply=(a:V,b:V)=>a.map((x,i)=>x*b[i]!) as V;
function exact(w:V,t:number):Q{const speed=norm(w);return speed===0?[0,0,0,1]:[...scale(w,Math.sin(speed*t/2)/speed),Math.cos(speed*t/2)];}
function reference(inertia:V,w:V,hz:number,frequency:number){
 let state:number[]=[...w,0,0,0,1];const rows=[];
 const derivative=(s:number[])=>{const angular=s.slice(0,3) as V,q=s.slice(3) as Q,torque=cross(multiply(inertia,angular),angular);return [...torque.map((x,i)=>x/inertia[i]!),...product(q,[...angular,0]).map(x=>x*.5)];};
 const substeps=frequency/hz;if(!Number.isInteger(substeps))throw Error('Reference grid must align with samples');
 const dt=1/frequency;
 for(let frame=1;frame<=hz/10;frame++){
  for(let j=0;j<substeps;j++){
   const k1=derivative(state),k2=derivative(state.map((x,i)=>x+dt*k1[i]!/2)),k3=derivative(state.map((x,i)=>x+dt*k2[i]!/2)),k4=derivative(state.map((x,i)=>x+dt*k3[i]!));
   state=state.map((x,i)=>x+dt*(k1[i]!+2*k2[i]!+2*k3[i]!+k4[i]!)/6);state.splice(3,4,...unit(state.slice(3) as Q));
  }
  rows.push({w:state.slice(0,3) as V,q:state.slice(3) as Q});
 }
 return rows;
}
const engine=resolve(process.argv[2]!),output=process.argv[3];if(!output)throw Error('Engine and output required');
const R=(await import(pathToFileURL(engine).href)).default;await R.init();
const oblique=scale([1,2,3],6/Math.sqrt(14));
const configs:[string,V][]=[['x6',[6,0,0]],['y6',[0,6,0]],['z6',[0,0,6]],['x30',[30,0,0]],['y30',[0,30,0]],['z30',[0,0,30]],['oblique',oblique]];
const rows=[],referenceControls=[];const started=performance.now();
for(const shape of ['short-box','long-box','sphere'])for(const hz of [60,960]){
 const span=shape==='long-box'?20:2;
 const perMass:V=shape==='sphere'?[.004,.004,.004]:[(.05**2+.5**2)/3,(span**2+.5**2)/3,(span**2+.05**2)/3];
 const fine=reference(perMass,oblique,hz,30720),coarse=reference(perMass,oblique,hz,15360);
 const initialL=multiply(perMass,oblique),initialE=dot(oblique,initialL)/2;
 const referenceError=Math.max(...fine.map((f,i)=>norm(add(f.w,scale(coarse[i]!.w,-1)))));
 const referenceMomentumError=Math.max(...fine.map(f=>norm(add(rotate(f.q,multiply(perMass,f.w)),scale(initialL,-1)))))/norm(initialL);
 const referenceEnergyError=Math.max(...fine.map(f=>Math.abs(dot(f.w,multiply(perMass,f.w))/2-initialE)))/initialE;
 if(referenceError>1e-8||referenceMomentumError>1e-9||referenceEnergyError>1e-9)throw Error('Reference integration failed independent precision/conservation controls');
 referenceControls.push({shape,hz,referenceError,referenceMomentumError,referenceEnergyError});
 for(const tilted of [false,true])for(const [spin,localW] of configs)for(const budget of [1,4,32,128]){
  if(performance.now()-started>30000)throw Error('Free-spin probe exceeded 30s work budget');
  const world=new R.World({x:0,y:0,z:0});
  try{
   world.timestep=1/hz;world.numSolverIterations=budget;world.integrationParameters.maxCcdSubsteps=0;
   const q0:Q=tilted?exact(scale([1,2,3],1/Math.sqrt(14)),.7):[0,0,0,1],worldW=rotate(q0,localW);
   const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation({x:q0[0],y:q0[1],z:q0[2],w:q0[3]}).setAngvel({x:worldW[0],y:worldW[1],z:worldW[2]}).setCanSleep(false));
   world.createCollider(shape==='sphere'?R.ColliderDesc.ball(.1):R.ColliderDesc.cuboid(span,.05,.5),body);body.recomputeMassPropertiesFromColliders();
   const mass=body.mass(),inertia=scale(perMass,mass),nativeQ0=quaternion(body.rotation()),nativeW0=vector(body.angvel());
   const l0=rotate(nativeQ0,multiply(inertia,rotate(inverse(nativeQ0),nativeW0))),e0=dot(rotate(inverse(nativeQ0),nativeW0),multiply(inertia,rotate(inverse(nativeQ0),nativeW0)))/2;
   const frames:Frame[]=[];
   for(let frame=1;frame<=hz/10;frame++){
    world.step();const q=quaternion(body.rotation()),w=vector(body.angvel()),local=rotate(inverse(q),w),momentum=rotate(q,multiply(inertia,local)),energy=dot(local,multiply(inertia,local))/2;
    const ref=spin==='oblique'&&shape!=='sphere'?fine[frame-1]!:{w:localW,q:exact(localW,frame/hz)},expectedQ=unit(product(q0,ref.q)),expectedW=rotate(expectedQ,ref.w);
    const record={frame,w,q,angularVelocityError:norm(add(w,scale(expectedW,-1))),orientationErrorRad:angle(q,expectedQ),relativeMomentumError:norm(add(momentum,scale(l0,-1)))/norm(l0),relativeEnergyError:Math.abs(energy-e0)/e0,relativeEnergyGain:(energy-e0)/e0,speedCapConfounded:norm(w)>=.99*Math.PI/4*hz};
    if(Object.values(record).some(x=>typeof x==='number'&&!Number.isFinite(x)))throw Error('Nonfinite free-spin measurement');
    frames.push(record);
   }
   const peak=(key:'angularVelocityError'|'relativeMomentumError'|'relativeEnergyError')=>frames.reduce((a,b)=>a[key]>b[key]?a:b);
   rows.push({shape,hz,tilted,spin,budget,stepsCompleted:frames.length,mass,initialAngularVelocity:nativeW0,initialRotation:nativeQ0,speedCapConfounded:frames.some(f=>f.speedCapConfounded),angularPeak:peak('angularVelocityError'),momentumPeak:peak('relativeMomentumError'),energyPeak:peak('relativeEnergyError'),final:frames.at(-1)});
  }finally{world.free();}
 }
}
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
writeFileSync(output,JSON.stringify({physicalAcceptance:false,engineSha256:hash(engine),sourceSha256:hash(import.meta.path),scope:'Force-free, no-contact, no-CCD dynamic bodies. Principal-axis and isotropic motion use analytic solutions; asymmetric oblique motion uses a double-precision Euler/RK4 reference checked at two resolutions and against momentum/energy conservation. Native integration remains f32. Every step is measured; peak and final witnesses are retained.',referenceControls,rows,elapsedMs:performance.now()-started},null,2)+'\n');
console.log({cases:rows.length,maxAngularVelocityError:Math.max(...rows.map(r=>r.angularPeak.angularVelocityError)),maxRelativeEnergyError:Math.max(...rows.map(r=>r.energyPeak.relativeEnergyError)),speedCapCases:rows.filter(r=>r.speedCapConfounded).length});
