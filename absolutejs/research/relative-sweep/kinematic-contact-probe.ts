import type Rapier from '../../../dist/types/rapier';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const enginePath=resolve('dist/rapier.mjs');
const R: typeof Rapier=(await import(pathToFileURL(enginePath).href)).default;
await R.init();
const cases=[];
for(const iterations of [4,16,32])for(const frequency of [30,120,240]) {
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=4;w.integrationParameters.numSolverIterations=iterations;w.integrationParameters.contact_natural_frequency=frequency;
  const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-.5,0,0).setCcdEnabled(true));
  const target=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setTranslation(.5,0,0).setLinvel(-120,0,0));
  for(const b of [body,target])w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b);
  const frames=[];
  for(let step=0;step<6;step++){
   w.step();
   frames.push({step,penetration:Math.max(0,.2-Math.abs(body.translation().x-target.translation().x)),bodyV:body.linvel().x,targetV:target.linvel().x});
  }
  cases.push({iterations,frequency,frames,peakPenetration:Math.max(...frames.map(f=>f.penetration))});
 }finally{w.free();}
}
writeFileSync('absolutejs/research/relative-sweep/'+(process.argv[2]??'kinematic-contact-result.json'),JSON.stringify({candidateOnly:true,scope:'Recorded solver-parameter interventions, not runtime tuning or acceptance',engineSha256:createHash('sha256').update(readFileSync(enginePath)).digest('hex'),cases},null,2)+'\n');
console.log(cases.map(({iterations,frequency,peakPenetration})=>({iterations,frequency,peakPenetration})));
