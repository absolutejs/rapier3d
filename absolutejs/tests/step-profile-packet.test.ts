import {beforeAll,expect,test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
function capture(kind:'empty'|'active'|'clock'|'capture'|'threw'='active',maxSamples=16){
 const w=new R.World({x:0,y:0,z:0});try{
  const b=kind==='empty'?null:w.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false));if(b)w.createCollider(R.ColliderDesc.cuboid(.2,.3,.4),b);
  if(kind==='capture')(w as any).contactConvergence=()=>null;
  if(kind==='threw')(w as any).step=()=>{throw Error('controlled');};
  const p=R.createPhysicsStepProfiler(w,{sampleEvery:1,maxSamples,...(kind==='clock'?{now:()=>NaN}:{})});
  for(let i=0;i<maxSamples+2;i++){b?.setAdditionalSolverIterations(i%4);try{p.step();}catch(e){if(kind!=='threw')throw e;}}
  return p.snapshot();
 }finally{w.free();}
}
test('numeric profile packets exactly round trip real active, empty and failure observations through JSON',()=>{
 for(const kind of ['empty','active','clock','capture','threw'] as const){const p=capture(kind),packet=R.encodePhysicsStepProfile(p);expect(R.decodePhysicsStepProfile(JSON.parse(JSON.stringify(packet)))).toEqual(p);}
 for(const n of [0,1,256]){const p=capture('empty',n);expect(R.decodePhysicsStepProfile(R.encodePhysicsStepProfile(p))).toEqual(p);}
});
test('packet transport preserves signed zero, subnormal numbers and explicit versus omitted indices',()=>{
 const p=capture();p.samples[0]!.wallTimeMs=-0;p.samples[0]!.native!.timings.stepMs=Number.MIN_VALUE;p.samples[1]!.native!.solverScheduleIndex=0;
 const q=R.decodePhysicsStepProfile(JSON.parse(JSON.stringify(R.encodePhysicsStepProfile(p))));expect(q).toEqual(p);expect(Object.is(q.samples[0]!.wallTimeMs,-0)).toBe(true);expect(q.samples[0]!.native!.timings.stepMs).toBe(Number.MIN_VALUE);expect(Object.hasOwn(q.samples[0]!.native!,'solverScheduleIndex')).toBe(Object.hasOwn(p.samples[0]!.native!,'solverScheduleIndex'));expect(Object.hasOwn(q.samples[1]!.native!,'solverScheduleIndex')).toBe(true);
});
test('encoded and decoded profiles own all arrays and nested observations',()=>{
 const p=capture(),packet=R.encodePhysicsStepProfile(p),original=structuredClone(packet),decoded=R.decodePhysicsStepProfile(packet);
 p.samples[0]!.native!.timings.stepMs=999;p.contactSettings[0]!.contactSoftness.naturalFrequency=999;p.solverSchedules[0]!.groupVisits=999;expect(packet).toEqual(original);
 decoded.samples[0]!.native!.timings.stepMs=123;decoded.contactSettings[0]!.contactSoftness.naturalFrequency=123;decoded.solverSchedules[0]!.groupVisits=123;expect(packet).toEqual(original);
 packet.samples[0]![4]![6]=456;expect(decoded.samples[0]!.native!.timings.stepMs).toBe(123);
});
test('packet decoding rejects oversized sparse malformed and dangling records before accepting data',()=>{
 const original=R.encodePhysicsStepProfile(capture());
 const change=(mutate:(p:any)=>void)=>{const p=structuredClone(original);mutate(p);expect(()=>R.decodePhysicsStepProfile(p)).toThrow();};
 for(const value of [null,{},[],{...original,format:'unknown'}])expect(()=>R.decodePhysicsStepProfile(value)).toThrow();
 change(p=>p.header.push(0));change(p=>p.header[0]=0);change(p=>p.header[2]=257);change(p=>p.header[3]=2**53);change(p=>p.header[4]++);change(p=>p.header[7]=Infinity);
 change(p=>p.samples=new Array(1000000));change(p=>delete p.samples[0]);change(p=>p.samples[0][1]=3);change(p=>p.samples[0][3]=1);change(p=>p.samples[0][2]='arbitrary text');change(p=>p.samples[0][4].push(0));change(p=>p.samples[0][4][3]=p.contactSettings.length);change(p=>p.samples[0][4][5]=p.solverSchedules.length);change(p=>delete p.samples[0][4][6]);change(p=>p.samples[0][4][12]=.5);change(p=>p.solverSchedules[0][0]=999);change(p=>p.contactSettings[0][0]=-1);
 let called=false;change(p=>Object.defineProperty(p.header,'0',{get(){called=true;return 1;}}));expect(called).toBe(false);
 const huge=capture();huge.samples=new Array(1000000);expect(()=>R.encodePhysicsStepProfile(huge)).toThrow();
});
test('two complete sampled attempts fit a compact diagnostic budget without rounding',()=>{
 const p=capture(),packet=R.encodePhysicsStepProfile(p),fields={attempts:[{physicsProfilePacket:packet},{physicsProfilePacket:packet}]};
 expect(JSON.stringify(fields).length).toBeLessThan(18000);expect(R.decodePhysicsStepProfile(packet)).toEqual(p);
 (p as any).email='not part of a numeric physics profile';expect(JSON.stringify(R.encodePhysicsStepProfile(p))).not.toContain('not part');
});
