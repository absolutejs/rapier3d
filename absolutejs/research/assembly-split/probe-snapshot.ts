import {fixture,measure,norm,sub} from '../../tests/assembly-split-fixture';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const enginePath=resolve(process.argv[2]!);const output=resolve(process.argv[3]!);
const R=(await import(enginePath)).default;await R.init();mkdirSync(output);
const hash=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
const equal=(a:Uint8Array,b:Uint8Array)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const {world:w,bodies,joints}=fixture(R);let restored:typeof w|undefined;
try {
 const before=measure(bodies);w.removeMultibodyJoint(joints[1]!,true);
 const snapshot=w.takeSnapshot();writeFileSync(join(output,'after-cut-before-step.bin'),snapshot);
 restored=R.World.restoreSnapshot(snapshot);
 const roundtrip=restored.takeSnapshot();writeFileSync(join(output,'restored-before-step.bin'),roundtrip);
 const restoredBodies=bodies.map(b=>restored!.getRigidBody(b.handle));
 const rows=[];let saved=false;
 const state=(bs:typeof bodies)=>bs.map(b=>({handle:b.handle,position:b.translation(),rotation:b.rotation(),linear:b.linvel(),angular:b.angvel(),com:b.worldCom()}));
 for(let step=1;step<=32;step++){
  w.step();restored.step();const a=w.takeSnapshot(),b=restored.takeSnapshot();
  const physicalA=state(bodies),physicalB=state(restoredBodies);
  const m=measure(bodies);
  rows.push({step,snapshotExact:equal(a,b),physicalExact:JSON.stringify(physicalA)===JSON.stringify(physicalB),bytes:[a.length,b.length],momentumError:norm(sub(m.p,before.p))/norm(before.p),energyError:Math.abs(m.energy/before.energy-1)});
  if(!saved&&!equal(a,b)){
   saved=true;writeFileSync(join(output,'first-original.bin'),a);writeFileSync(join(output,'first-restored.bin'),b);
   writeFileSync(join(output,'first-physical-states.json'),JSON.stringify({step,original:physicalA,restored:physicalB},null,2)+'\n');
  }
 }
 const result={engine:R.buildInfo,engineApiSha256:hash(readFileSync(enginePath)),roundtripExact:equal(snapshot,roundtrip),beforeSha256:hash(snapshot),roundtripSha256:hash(roundtrip),allPhysicalStatesExact:rows.every(r=>r.physicalExact),allSnapshotsExact:rows.every(r=>r.snapshotExact),rows};
 writeFileSync(join(output,'result.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({version:R.buildInfo.packageVersion,roundtrip:result.roundtripExact,physical:result.allPhysicalStatesExact,snapshots:result.allSnapshotsExact,first:rows[0]}));
}finally{restored?.free();w.free();}
