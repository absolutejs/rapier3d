import type Rapier from '../../../dist/types/rapier';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const enginePath=resolve('dist/rapier.mjs');
const R: typeof Rapier=(await import(pathToFileURL(enginePath).href)).default;
await R.init();
const cases:Array<{kind:string;scale:number;boost:number;reversed:boolean;bodyX:number;targetX:number;crossed:boolean;normalizedPenetration:number}>=[]; const start=performance.now();
for(const kind of ['velocity','position'])for(const scale of [.01,1,100])for(const boost of [-60,0,60])for(const reversed of [false,true]) {
 if(performance.now()-start>15000)throw Error('Scale probe wall budget');
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=4;w.integrationParameters.lengthUnit=scale;
  const dynamic=R.RigidBodyDesc.dynamic().setTranslation(-.5*scale,0,0).setLinvel(boost*scale,0,0).setCcdEnabled(true);
  const kinematic=(kind==='velocity'?R.RigidBodyDesc.kinematicVelocityBased():R.RigidBodyDesc.kinematicPositionBased()).setTranslation(.5*scale,0,0);
  const created=(reversed?[kinematic,dynamic]:[dynamic,kinematic]).map(d=>w.createRigidBody(d));
  const body=created[reversed?1:0]!,target=created[reversed?0:1]!;
  for(const b of created)w.createCollider(R.ColliderDesc.ball(.1*scale).setFriction(0).setRestitution(0),b);
  if(kind==='velocity')target.setLinvel({x:(-120+boost)*scale,y:0,z:0},true);
  else target.setNextKinematicTranslation({x:(-1.5+boost/60)*scale,y:0,z:0});
  w.step();
  cases.push({kind,scale,boost,reversed,bodyX:body.translation().x/scale-boost/60,targetX:target.translation().x/scale-boost/60,crossed:target.translation().x<body.translation().x,normalizedPenetration:Math.max(0,.2-Math.abs(target.translation().x-body.translation().x)/scale)});
 }finally{w.free();}
}
const maxFrameError=Math.max(...cases.map(c=>Math.abs(c.bodyX-cases.find(r=>r.kind===c.kind&&r.scale===c.scale&&r.reversed===c.reversed&&r.boost===0)!.bodyX)));
const maxOrderError=Math.max(...cases.map(c=>Math.abs(c.bodyX-cases.find(r=>r.kind===c.kind&&r.scale===c.scale&&r.boost===c.boost&&!r.reversed)!.bodyX)));
const result={candidateOnly:true,engineSha256:createHash('sha256').update(readFileSync(enginePath)).digest('hex'),cases,crossings:cases.filter(c=>c.crossed).length,maxFrameError,maxOrderError,maxNormalizedPenetration:Math.max(...cases.map(c=>c.normalizedPenetration))};
writeFileSync('absolutejs/research/relative-sweep/'+(process.argv[2]??'kinematic-scale-result.json'),JSON.stringify(result,null,2)+'\n');
console.log({cases:cases.length,crossings:result.crossings,maxFrameError,maxOrderError,maxNormalizedPenetration:result.maxNormalizedPenetration});
