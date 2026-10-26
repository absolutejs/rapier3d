import type Rapier from '../../../dist/types/rapier';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const R: typeof Rapier = (await import(pathToFileURL(resolve('dist/rapier.mjs')).href)).default;
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
await R.init();
const cases=[];
for(const mode of ['solid','sensor','collision-groups','solver-groups','no-full-ccd']) {
 const w=new R.World({x:0,y:0,z:0}), events=new R.EventQueue(true);
 try {
  w.timestep=1/60; w.integrationParameters.maxCcdSubsteps=4; w.profilerEnabled=true;
  const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-.5,0,0).setCcdEnabled(mode!=='no-full-ccd'));
  const k=w.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setTranslation(.5,0,0).setLinvel(-120,0,0));
  for(const [i,b] of [body,k].entries()) {
   const c=R.ColliderDesc.ball(.1).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
   if(mode==='sensor'&&i===1)c.setSensor(true);
   if(mode==='collision-groups')c.setCollisionGroups(i===0?0x00010001:0x00020002);
   if(mode==='solver-groups')c.setSolverGroups(i===0?0x00010001:0x00020002);
   w.createCollider(c,b);
  }
  body.sleep(); w.step(events);
  const recorded:Array<{started:boolean}>=[];events.drainCollisionEvents((_a,_b,started)=>recorded.push({started}));
  cases.push({mode,bodyX:body.translation().x,targetX:k.translation().x,sleeping:body.isSleeping(),passes:w.ccdSubsteps(),events:recorded});
 }finally{events.free();w.free();}
}
const violations=cases.filter(c=>c.mode==='solid'?c.bodyX>c.targetX:Math.abs(c.bodyX+.5)>1e-6||!c.sleeping);
writeFileSync('absolutejs/research/relative-sweep/'+(process.argv[2]??'kinematic-filter-result.json'),JSON.stringify({candidateOnly:true,engineSha256:createHash('sha256').update(readFileSync('dist/rapier.mjs')).digest('hex'),cases,violations:violations.length},null,2)+'\n');
console.log({cases:cases.length,violations:violations.length});
