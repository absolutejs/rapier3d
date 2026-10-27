/** Quantify intentional dynamic differences; exact old-rounding parity is not acceptance. */
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import R from '@absolutejs/rapier3d';
import upstream from '@dimforge/rapier3d-compat';
import {fixture} from '../../tests/fixture';
await Promise.all([R.init(),upstream.init()]);
const rows=[];
for(const hz of [960,1920])for(const tilt of [0,.3]){
 const a=fixture(R,hz,tilt),b=fixture(upstream,hz,tilt),started=performance.now();
 const peaks={translation:0,rotation:0,linvel:0,angvel:0};let firstDifferentFrame:number|null=null;
 try{
  for(let frame=1;frame<=2*hz;frame++){
   if(frame%120===0&&performance.now()-started>15000)throw Error('Motion comparison exceeded 15s per case');
   a.w.step();b.w.step();
   for(let body=0;body<2;body++)for(const property of ['translation','rotation','linvel','angvel'] as const){
    const x=a.bodies[body]![property](),y=b.bodies[body]![property]();
    const distance=Math.hypot(...Object.keys(x).map(key=>(x as any)[key]-(y as any)[key]));
    if(!Number.isFinite(distance))throw Error('Nonfinite motion');
    if(distance>0&&firstDifferentFrame===null)firstDifferentFrame=frame;
    peaks[property]=Math.max(peaks[property],distance);
   }
  }
  rows.push({hz,tilt,frames:2*hz,firstDifferentFrame,peaks,elapsedMs:performance.now()-started});
 }finally{a.w.free();b.w.free();}
}
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
writeFileSync('absolutejs/research/gyroscopic-precision/upstream-motion.json',JSON.stringify({scope:'Two-second cavity/chip contact trajectories. Translation and linear velocity use fixture centimeters; rotation is quaternion component distance, angular velocity radians/second. Chaotic contact differences are recorded, not treated as proof of improved contact physics.',packageSha256:hash('dist/rapier.mjs'),sourceSha256:hash(import.meta.path),rows},null,2)+'\n');
console.log(rows);
