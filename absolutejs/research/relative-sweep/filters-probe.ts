/** No rendering: check candidate CCD filtering and sensor event behavior. */
import R from '../../../dist/rapier.mjs';
import {writeFileSync} from 'node:fs';
await R.init();
const cases=[];
for(const mode of ['solid','sensor','collision-groups','solver-groups']) {
 const w=new R.World({x:0,y:0,z:0}), events=new R.EventQueue(true);
 try {
  w.timestep=1/60;w.integrationParameters.maxCcdSubsteps=4;
  const bodies=[-1,1].map((x,i)=>{
   const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x,0,0).setLinvel(i===0?120:-120,0,0).setCcdEnabled(true));
   const c=R.ColliderDesc.ball(.1).setRestitution(0).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
   if(mode==='sensor'&&i===1)c.setSensor(true);
   if(mode==='collision-groups')c.setCollisionGroups(i===0?0x00010001:0x00020002);
   if(mode==='solver-groups')c.setSolverGroups(i===0?0x00010001:0x00020002);
   w.createCollider(c,b);return b;
  });
  w.step(events);const recorded=[];events.drainCollisionEvents((a,b,started)=>recorded.push({a,b,started}));
  const crossed=bodies[0].translation().x>bodies[1].translation().x;
  if(mode==='solid'&&crossed)throw Error('Solid tunneled');
  if(mode!=='solid'&&!crossed)throw Error('Pseudo/filtered pair clamped');
  if(mode==='collision-groups'&&recorded.length)throw Error('Excluded pair emitted events');
  if(mode==='sensor'&&(recorded.length!==2||!recorded[0].started||recorded[1].started)) throw Error('Sensor crossing must emit exactly one ordered start/stop pair');
  cases.push({mode,crossed,events:recorded});
 } finally {events.free();w.free();}
}
writeFileSync('absolutejs/research/relative-sweep/filter-result.json',JSON.stringify({cases},null,2)+'\n');
console.log(cases);
