/** Cold controls for contact-component clamping; no render or gameplay acceptance. */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const engine=resolve(process.argv[2]??'dist/rapier.mjs');
const output=process.argv[3];if(!output)throw Error('Explicit output path required');
const R=(await import(pathToFileURL(engine).href)).default;await R.init();
const cases=[];
for(const angle of [0,Math.PI/4,Math.PI/2]) for(const scale of [.1,1,2]) for(const reverse of [false,true]) for(const mode of ['touching-slide','positive-gap','sensor','solver-filter','kinematic','stacked-support','touching-separate']) {
 const rotate=(x:number,y:number)=>({x:Math.cos(angle)*x-Math.sin(angle)*y,y:Math.sin(angle)*x+Math.cos(angle)*y,z:0});
 const localY=(p:{x:number;y:number})=>-Math.sin(angle)*p.x+Math.cos(angle)*p.y;
 const rotation={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};
 const w=new R.World({x:0,y:0,z:0});
 try {
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=1;
  w.integrationParameters.normalizedPredictionDistance=.1*scale;
  w.integrationParameters.normalizedAllowedLinearError=.0001*scale;
  const make=(neighbor:boolean)=>{
   const desc=neighbor&&mode==='kinematic'?R.RigidBodyDesc.kinematicVelocityBased():R.RigidBodyDesc.dynamic();
   const stacked=mode==='stacked-support'||mode==='touching-separate';
   const pos=rotate(neighbor&&!stacked?(.2+(mode==='positive-gap'?.01:0))*scale:0,(neighbor&&stacked?1.2:1)*scale);
   const vel=rotate(0,(neighbor&&mode==='touching-separate'?120:-120)*scale);
   const body=w.createRigidBody(desc.setTranslation(pos.x,pos.y,0).setRotation(rotation).setLinvel(vel.x,vel.y,0).setCcdEnabled(true));
   const collider=R.ColliderDesc.cuboid(.1*scale,.1*scale,.1*scale).setFriction(0).setRestitution(0);
   if(neighbor&&mode==='sensor')collider.setSensor(true);
   if(neighbor&&mode==='solver-filter')collider.setSolverGroups(0);
   w.createCollider(collider,body);return body;
  };
  const first=make(reverse),second=make(!reverse);
  const a=reverse?second:first,b=reverse?first:second;
  const floor=rotate(0,-.1*scale);
  w.createCollider(R.ColliderDesc.cuboid(.05*scale,.1*scale,.5*scale).setTranslation(floor.x,floor.y,0).setRotation(rotation).setFriction(0));
  w.stepTraceEnabled=true;w.step();
  const trace=w.stepTrace();
  const freeY=(mode==='stacked-support'||mode==='touching-separate'?1.2:1)*scale+(mode==='touching-separate'?120:-120)*scale*w.timestep;
  const supportClearance=localY(b.translation())-localY(a.translation())-.2*scale;
  cases.push({mode,angle,scale,reverse,supportClearance,a:a.translation(),b:b.translation(),freeY,freeMotionError:Math.abs(localY(b.translation())-freeY),aStopped:localY(a.translation())>.05*scale,trace:trace?{...trace,data:Array.from(trace.data),impacts:Array.from(trace.impacts)}:null});
 }finally{w.free();}
}
const result={sourceSha256:createHash('sha256').update(readFileSync(import.meta.path)).digest('hex'),engineSha256:createHash('sha256').update(readFileSync(engine)).digest('hex'),scope:'Two frictionless side-by-side bodies; only the first intersects a narrow floor. Its clamp must not drag the second tangentially. Also tests gap/sensor/filter/kinematic exclusions, a supported stack and separating contact. Three scales stay below the solver speed cap; both body insertion orders and three whole-scene orientations are tested. This does not test angular motion.',cases,failures:cases.filter(c=>!c.aStopped||(c.mode==='stacked-support'?c.supportClearance < -.001*c.scale:c.freeMotionError>1e-4*c.scale)).map(c=>({mode:c.mode,angle:c.angle,scale:c.scale,reverse:c.reverse}))};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log({failures:result.failures,cases:cases.map(c=>({mode:c.mode,angle:c.angle,scale:c.scale,reverse:c.reverse,error:c.freeMotionError}))});

if(result.failures.length)process.exitCode=1;
