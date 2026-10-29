import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const R=(await import(resolve(process.argv[2]!))).default;
await R.init();
const path='../hello-world-rotational-contact-qualification/docs/terrain-contact-continuation-2026-10-28/variant-5-960/step-876.bin';
const input=readFileSync(path),w=R.World.restoreSnapshot(input),rows=[];
try{
 for(let step=877;step<=880;step++){
  w.step();const contacts:any[]=[];
  w.contactPair(w.getCollider(0),w.getCollider(Number.MIN_VALUE),(m:any)=>{
   contacts.push({triangle:m.subshape1(),normal:m.normal(),distances:Array.from({length:m.numContacts()},(_,i)=>m.contactDist(i)),solverDistances:Array.from({length:m.numSolverContacts()},(_,i)=>m.solverContactDist(i))});
  });
  rows.push({step,contacts,snapshotSha256:createHash('sha256').update(w.takeSnapshot()).digest('hex')});
 }
 writeFileSync(process.argv[3]!,JSON.stringify({buildInfo:R.buildInfo,inputSha256:createHash('sha256').update(input).digest('hex'),rows},null,2)+'\n');
}finally{w.free();}
