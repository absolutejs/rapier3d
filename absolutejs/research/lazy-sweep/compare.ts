import Baseline from '../../../../hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs';
import Candidate from './dist/rapier.mjs';
await Baseline.init();
await Candidate.init();
function simulate(R: typeof Baseline, mode: string) {
 const w = new R.World({x:0,y:0,z:0}), events=new R.EventQueue(true);
 try {
  w.timestep=1/480; w.profilerEnabled=true; w.integrationParameters.maxCcdSubsteps=4;
  const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setCcdEnabled(true).setCanSleep(false).setLinvel(100,0,0));
  for(let i=0;i<80;i++) {
   const x=(i%5)*0.04,y=Math.floor(i/5)*0.04;
   const shape=R.ColliderDesc.convexHull(new Float32Array([x,y,0,x+0.03,y,0,x,y+0.03,0,x,y,0.03]));
   if(!shape)throw Error('Convex fixture failed');
   w.createCollider(shape.setActiveHooks(R.ActiveHooks.FILTER_CONTACT_PAIRS),body);
  }
  w.createCollider(R.ColliderDesc.cuboid(0.005,100,100).setTranslation(mode==='empty'?10000:2,0,0));
  let ccdMs=0, hookCalls=0;
  const hooks={filterContactPair:()=>{hookCalls++; return mode==='filtered'?null:R.SolverFlags.COMPUTE_IMPULSE;},filterIntersectionPair:()=>true};
  const poses=[];
  const start=performance.now();
  for(let i=0;i<240;i++) {
   w.step(events,hooks); ccdMs+=w.timingCcd();
   poses.push([body.translation(),body.rotation(),body.linvel(),body.angvel()]);
  }
  const elapsedMs=performance.now()-start;
  if(mode==='wall' && body.translation().x>=2)throw Error('Thin wall tunneling');
  if(mode!=='empty' && hookCalls===0)throw Error('Hook fixture did not exercise filtering');
  if(mode==='filtered' && body.translation().x<=2)throw Error('Filtered wall unexpectedly blocked motion');
  return {ccdMs,elapsedMs,poses,hookCalls};
 }finally{events.free();w.free();}
}
const results=[];
for(let repetition=0;repetition<3;repetition++) for(const mode of ['empty','wall','filtered']) {
 const baseline=simulate(Baseline,mode), candidate=simulate(Candidate,mode);
 const equal=JSON.stringify(baseline.poses)===JSON.stringify(candidate.poses);
 if(!equal || baseline.hookCalls!==candidate.hookCalls)throw Error('Lazy sweep changed native motion');
 results.push({repetition,mode,exactMotion:equal,hookCalls:baseline.hookCalls,baseline:{ccdMs:baseline.ccdMs,elapsedMs:baseline.elapsedMs},candidate:{ccdMs:candidate.ccdMs,elapsedMs:candidate.elapsedMs}});
}
await Bun.write('absolutejs/research/lazy-sweep/comparison.json',JSON.stringify({scope:'research candidate, single-run timings; empty-space and thin-wall controls',results},null,2)+'\n');
console.log(results);
