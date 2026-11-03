import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const {default:R,buildInfo}=await import(resolve(process.argv[2]!));
await R.init();
const {model}=JSON.parse(readFileSync(new URL('./cut-fragment.json',import.meta.url),'utf8'));
const units=100,hz=Number(process.argv[4] ?? 1920),iterations=Number(process.argv[5] ?? 8),restitution=Number(process.argv[6] ?? 0.1);
if(![480,960,1920,3840,7680].includes(hz) || ![8,16,32].includes(iterations) || ![0,.1].includes(restitution)) throw Error("Unsupported bounded diagnostic control");
function rotated(p:number[],q:any) {
 const t=[2*(q.y*p[2]!-q.z*p[1]!),2*(q.z*p[0]!-q.x*p[2]!),2*(q.x*p[1]!-q.y*p[0]!)];
 return [p[0]!+q.w*t[0]!+q.y*t[2]!-q.z*t[1]!,p[1]!+q.w*t[1]!+q.z*t[0]!-q.x*t[2]!,p[2]!+q.w*t[2]!+q.x*t[1]!-q.y*t[0]!];
}
let lift=2;
for(const f of model.colliders) for(let i=0;i<f.solverPoints.length;i+=3) {
 const p=rotated(f.solverPoints.slice(i,i+3).map((x:number)=>x/units),f.rotation);
 lift=Math.max(lift,-p[1]!-f.origin[1]+2);
}
const world=new R.World({x:0,y:-9.81*units,z:0});
try {
 world.timestep=1/hz;
 world.integrationParameters.lengthUnit=units;
 world.integrationParameters.numSolverIterations=iterations;
 world.integrationParameters.staticContactSoftness={naturalFrequency:600,dampingRatio:10};
 world.integrationParameters.normalizedAllowedLinearError=.0001;
 world.integrationParameters.maxCcdSubsteps=4;
 world.createCollider(R.ColliderDesc.cuboid(3200,100,3200).setTranslation(0,-100,0).setFriction(.7).setRestitution(restitution));
 const mass=model.materialMass;
 const desc=R.RigidBodyDesc.dynamic().setTranslation(model.center[0]*units,(model.center[1]+lift)*units,model.center[2]*units).setCcdEnabled(true).setCanSleep(true).setAdditionalMassProperties(mass.massKg,{x:0,y:0,z:0},{x:mass.principal[0]*units**2,y:mass.principal[1]*units**2,z:mass.principal[2]*units**2},mass.frame);
 const body=world.createRigidBody(desc);
 for(const f of model.colliders) world.createCollider(R.ColliderDesc.convexHull(Float32Array.from(f.solverPoints)).setTranslation(...f.origin.map((v:number,k:number)=>(v-model.center[k])*units)).setRotation(f.rotation).setDensity(0).setFriction(.7).setRestitution(restitution),body);
 body.recomputeMassPropertiesFromColliders();
 let steps=0; const samples=[];
 const state=()=>({position:body.translation(),rotation:body.rotation(),linear:body.linvel(),angular:body.angvel(),sleeping:body.isSleeping()});
 while(steps<hz*20 && !body.isSleeping()) {world.step();steps++;if(steps%hz===0)samples.push({seconds:steps/hz,...state()});}
 const record={buildInfo,scope:'one convex cut fragment against a cuboid floor; fixed material inertia',units,hz,iterations,restitution,lift,steps,seconds:steps/hz,final:state(),samples};
 writeFileSync(process.argv[3]!,JSON.stringify(record,null,2));
 console.log(JSON.stringify({packageVersion:buildInfo.packageVersion,steps,seconds:steps/hz,sleeping:body.isSleeping()}));
} finally {world.free();}
