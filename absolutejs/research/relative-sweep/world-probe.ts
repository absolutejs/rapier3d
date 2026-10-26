import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type Rapier from '../../../dist/types/rapier';
const enginePath = resolve(process.argv[2] ?? 'dist/rapier.mjs');
const R: typeof Rapier = (await import(pathToFileURL(enginePath).href)).default;
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
await R.init();
const cases: Array<{kind:string;flags:boolean[];cap:number;boost:number;p:number[][];v:number[][];reversedOrder:boolean;kinetic:number;passes:number|null}> = [];
const started = performance.now();
for (const kind of ['head-on', 'perpendicular', 'near-miss']) {
 for (const flags of [[true,false],[true,true],[false,true]]) {
  for (const cap of [1,4,16]) {
   for (const boost of [-120,-60,0,60,120]) {
    if(performance.now()-started>15000) throw Error('Bounded world probe exceeded');
    const w=new R.World({x:0,y:0,z:0});
    try {
     w.timestep=1/60; w.integrationParameters.maxCcdSubsteps=cap; w.profilerEnabled=true;
     const positions=kind==='perpendicular'?[[-1,0],[0,-1]]:[[-.5,kind==='near-miss'?.3:0],[.5,0]];
     const velocities=kind==='perpendicular'?[[120,0],[0,120]]:[[120,0],[0,0]];
     const bodies=positions.map((p,i)=>{
      const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p[0],p[1],0).setLinvel(velocities[i][0]+boost,velocities[i][1],0).setCcdEnabled(flags[i]));
      w.createCollider(R.ColliderDesc.ball(.1).setFriction(0).setRestitution(0),b); return b;
     });
     w.step();
     const p=bodies.map(b=>{const q=b.translation();return [q.x-boost/60,q.y,q.z];});
     const v=bodies.map(b=>{const q=b.linvel();return [q.x-boost,q.y,q.z];});
     const initialRelative=positions[1].map((x,i)=>x-positions[0][i]);
     const finalRelative=p[1].map((x,i)=>x-p[0][i]);
     const reversedOrder=initialRelative.reduce((s,x,i)=>s+x*finalRelative[i],0)<0;
     const kinetic=v.flat().reduce((s,x)=>s+x*x/2,0);
     cases.push({kind,flags,cap,boost,p,v,reversedOrder,kinetic,passes:w.ccdSubsteps()});
    } finally {w.free();}
   }
  }
 }
}
const crossings=cases.filter(c=>c.kind!=='near-miss'&&c.reversedOrder);
const gains=cases.filter(c=>c.kinetic>(c.kind==='perpendicular'?14400:7200)+.1);
const frameComparisons=cases.map(c=>{
 const reference=cases.find(r=>r.kind===c.kind&&r.cap===c.cap&&r.boost===0&&r.flags.join()===c.flags.join())!;
 return {kind:c.kind,flags:c.flags,cap:c.cap,boost:c.boost,maxPositionDifference:Math.max(...c.p.flat().map((x,i)=>Math.abs(x-reference.p.flat()[i])))};
});
const maxFrameDifferenceByCap=Object.fromEntries([1,4,16].map(cap=>[cap,Math.max(...frameComparisons.filter(c=>c.cap===cap).map(c=>c.maxPositionDifference))]));
const result={candidateOnly:true,engineSha256:createHash('sha256').update(readFileSync(enginePath)).digest('hex'),frameComparisons,maxFrameDifferenceByCap,scope:'135 two-sphere world cases, crossing and energy observations; not full physical qualification',cases,crossings:crossings.length,energyGains:gains.length};
writeFileSync('absolutejs/research/relative-sweep/' + (process.argv[3] ?? 'world-result.json'),JSON.stringify(result,null,2)+'\n');
console.log({cases:cases.length,crossings:crossings.length,energyGains:gains.length,maxFrameDifferenceByCap});
