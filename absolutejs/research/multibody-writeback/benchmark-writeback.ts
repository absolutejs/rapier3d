import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type RAPIER from '@absolutejs/rapier3d';
const out=resolve(process.argv[2]!);mkdirSync(out);
const source='/home/alexkahn/alex/rapier-impact-research/absolutejs/research/dynamic-impact/stable-multibody-captured';
const modules={stable:resolve('.absolutejs/published-0.8.0/rapier.mjs'),candidate:resolve('dist/rapier.mjs')};
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const inputs=[import.meta.path,...Object.values(modules),...[2,4,8,16].map(n=>`${source}/first-failure-${n}-0-60-before.bin`)];
const hashes=Object.fromEntries(inputs.map(p=>[p,hash(readFileSync(p))]));
writeFileSync(`${out}/manifest.json`,JSON.stringify({hashes,bun:Bun.version,scope:'sequential CPU step timing, identical captured articulated-impact snapshots, restore excluded, not FPS',warmups:10,samples:60},null,2));
const engines={} as Record<keyof typeof modules,typeof RAPIER>;
for(const name of ['stable','candidate'] as const){engines[name]=(await import(modules[name])).default;await engines[name].init();}
const rows=[];
for(const links of [2,4,8,16]){
 const bytes=readFileSync(`${source}/first-failure-${links}-0-60-before.bin`);
 const times:Record<keyof typeof modules,number[]>={stable:[],candidate:[]};
 for(let round=-10;round<60;round++)for(const name of round%2===0?['stable','candidate'] as const:['candidate','stable'] as const){
  const w=engines[name].World.restoreSnapshot(bytes);
  try{
   if(round===-10&&hash(w.takeSnapshot())!==hash(bytes))throw Error('Input snapshot changed during decode');
   const start=Bun.nanoseconds();w.step();const elapsedMs=(Bun.nanoseconds()-start)/1e6;
   if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw Error('Invalid timing');
   if(round>=0)times[name].push(elapsedMs);
  }finally{w.free();}
 }
 const summary=Object.fromEntries(Object.entries(times).map(([name,values])=>{
  const sorted=[...values].sort((a,b)=>a-b);return[name,{medianMs:(sorted[29]!+sorted[30]!)/2,p95Ms:sorted[Math.ceil(.95*sorted.length)-1],samplesMs:values}];
 }));
 rows.push({links,bodyCount:links+1,summary});writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));
}
if(inputs.some(p=>hash(readFileSync(p))!==hashes[p]))throw Error('Inputs changed');
writeFileSync(`${out}/complete.json`,JSON.stringify({cases:rows.length,sourceUnchanged:true}));
