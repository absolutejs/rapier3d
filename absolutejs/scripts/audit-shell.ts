/** Independent corner-plane audit; does not depend on mesh Boolean classification. */
import R from '../../dist/rapier.mjs';
import { fixture } from '../tests/fixture';
import { writeFileSync } from 'node:fs';
await R.init();
const rotate=(p:number[],q:{x:number;y:number;z:number;w:number})=>{
 const t=[2*(q.y*p[2]!-q.z*p[1]!),2*(q.z*p[0]!-q.x*p[2]!),2*(q.x*p[1]!-q.y*p[0]!)];
 return [p[0]!+q.w*t[0]!+q.y*t[2]!-q.z*t[1]!,p[1]!+q.w*t[1]!+q.z*t[0]!-q.x*t[2]!,p[2]!+q.w*t[2]!+q.x*t[1]!-q.y*t[0]!];
};
const observations=[];
for(const hz of [960,1920])for(const tilt of [0,.3]) {
 const {w,a,b,bodies}=fixture(R,hz,tilt);
 try {
  let peakCornerM=0,peakCachedDepthM=0,finalCornerM=0,peakAt:any=null,contacts=0;
  for(let step=0;step<hz*2;step++) {
   w.step();let cachedDepthM=0;
   w.solverContactPair(a,b,m=>{contacts+=m.numSolverContacts();for(let i=0;i<m.numSolverContacts();i++)cachedDepthM=Math.max(cachedDepthM,-m.solverContactDist(i)/100);});
   peakCachedDepthM=Math.max(peakCachedDepthM,cachedDepthM);
   const [chip,shell]=bodies,p=chip.translation(),o=shell.translation(),q=chip.rotation(),s=shell.rotation();
   let cornerM=0;
   for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]) {
    const v=rotate([x,y,z],q),local=rotate([v[0]!+p.x-o.x,v[1]!+p.y-o.y,v[2]!+p.z-o.z],{x:-s.x,y:-s.y,z:-s.z,w:s.w});
    cornerM=Math.max(cornerM,(Math.max(...local.map(Math.abs))-1)/100);
   }
   if(!Number.isFinite(cornerM)||!Number.isFinite(cachedDepthM))throw Error('Non-finite audit');
   if(cornerM>peakCornerM){peakCornerM=cornerM;peakAt={step,seconds:(step+1)/hz,cornerM,cachedDepthM};}
   finalCornerM=cornerM;
  }
  observations.push({hz,tilt,contacts,peakCornerM,peakCachedDepthM,finalCornerM,peakAt,sleeping:bodies.map(body=>body.isSleeping())});
 }finally{w.free();}
}
const result={scope:'Analytic cube-shell diagnostic; no runtime qualification',solverDistance:'cached contact update',cornerDistance:'current transformed vertices, evaluated every physics step',observations};
writeFileSync('absolutejs/evidence/shell-distances.json',JSON.stringify(result,null,2)+'\n');console.log(result);
