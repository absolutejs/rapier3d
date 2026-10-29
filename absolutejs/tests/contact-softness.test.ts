import {beforeAll,expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import R from '../../dist/rapier.mjs';
beforeAll(async()=>{await R.init();});
test('contact softness defaults, independent scopes and copy semantics',()=>{
 const w=new R.World({x:0,y:-9.81,z:0});
 try{
  const p=w.integrationParameters;
  expect(p.contactSoftness).toEqual({naturalFrequency:30,dampingRatio:10});
  expect(p.staticContactSoftness).toEqual({naturalFrequency:60,dampingRatio:10});
  const copy=p.staticContactSoftness;copy.naturalFrequency=900;
  expect(p.staticContactSoftness.naturalFrequency).toBe(60);
  p.staticContactSoftness={naturalFrequency:600.1,dampingRatio:2.1};
  expect(p.staticContactSoftness).toEqual({naturalFrequency:Math.fround(600.1),dampingRatio:Math.fround(2.1)});
  expect(p.contactSoftness).toEqual({naturalFrequency:30,dampingRatio:10});
  p.contactSoftness={naturalFrequency:120,dampingRatio:0};
  expect(p.contactSoftness).toEqual({naturalFrequency:120,dampingRatio:0});
  const snapshot=w.takeSnapshot(),restored=R.World.restoreSnapshot(snapshot);
  try{expect(restored.integrationParameters.staticContactSoftness).toEqual(p.staticContactSoftness);expect(restored.integrationParameters.contactSoftness).toEqual(p.contactSoftness);expect(restored.takeSnapshot()).toEqual(snapshot);}finally{restored.free();}
 }finally{w.free();}
});
test('invalid softness updates are atomic in both wrapper and native binding',()=>{
 const w=new R.World({x:0,y:0,z:0});
 try{
  const p=w.integrationParameters;
  for(const scope of ['contactSoftness','staticContactSoftness'] as const){
   const before=p[scope];
   for(const value of [null,undefined,{}, {naturalFrequency:0,dampingRatio:1},{naturalFrequency:-1,dampingRatio:1},{naturalFrequency:Number.MIN_VALUE,dampingRatio:1},{naturalFrequency:1e39,dampingRatio:1},{naturalFrequency:1e38,dampingRatio:1},{naturalFrequency:600,dampingRatio:NaN},{naturalFrequency:600,dampingRatio:-1},{naturalFrequency:600,dampingRatio:2e38},{naturalFrequency:'600',dampingRatio:1},{naturalFrequency:Infinity,dampingRatio:1}]){
    expect(()=>{p[scope]=value as any;}).toThrow();expect(p[scope]).toEqual(before);
   }
  }
  for(const fixed of [false,true]){
   const before={dynamic:p.contactSoftness,fixed:p.staticContactSoftness};
   for(const [frequency,damping]of [[NaN,10],[600,-1],[1e38,1],[600,2e38]]){
    expect(()=>p.raw.setContactSoftness(fixed,frequency!,damping!)).toThrow();
    expect({dynamic:p.contactSoftness,fixed:p.staticContactSoftness}).toEqual(before);
   }
  }
 }finally{w.free();}
});
test('fixed-contact coefficient changes actual saved-world response and replays exactly',()=>{
 const bytes=readFileSync(new URL('./fixtures/terrain-contact-softness-before.bin',import.meta.url));
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('e31d7530200f3cf27bb09cc3b6067c7f45fb107a0d02ee29c03042a0097d52d7');
 const worlds=[R.World.restoreSnapshot(bytes),R.World.restoreSnapshot(bytes),R.World.restoreSnapshot(bytes),R.World.restoreSnapshot(bytes)];
 const pose=(w:typeof worlds[number])=>{const b=w.getRigidBody(0);return {p:b.translation(),q:b.rotation(),v:b.linvel(),a:b.angvel()};};
 try{
  worlds[1]!.integrationParameters.contactSoftness={naturalFrequency:600,dampingRatio:10};
  for(const i of [2,3])worlds[i]!.integrationParameters.staticContactSoftness={naturalFrequency:600,dampingRatio:10};
  for(let step=0;step<32;step++){
   for(const w of worlds)w.step();
   expect(pose(worlds[0]!)).toEqual(pose(worlds[1]!));
   expect(worlds[2]!.takeSnapshot()).toEqual(worlds[3]!.takeSnapshot());
   for(const v of Object.values(pose(worlds[2]!)))for(const n of Object.values(v))expect(Number.isFinite(n)).toBe(true);
  }
  expect(pose(worlds[2]!)).not.toEqual(pose(worlds[0]!));
 }finally{for(const w of worlds)w.free();}
});

test('bounded profiles deduplicate and own settings across later changes and world disposal',()=>{
 const w=new R.World({x:0,y:-9.81,z:0});
 const p=R.createPhysicsStepProfiler(w,{sampleEvery:1,maxSamples:4});
 try{
  p.step();p.step();w.integrationParameters.staticContactSoftness={naturalFrequency:600,dampingRatio:10};p.step();
  w.integrationParameters.staticContactSoftness={naturalFrequency:60,dampingRatio:10};p.step();
  const report=p.snapshot();
  expect(report.contactSettings).toHaveLength(2);
  expect(report.samples.map(s=>s.native!.contactSettingsIndex)).toEqual([0,0,1,0]);
  expect(report.contactSettings[0]!.staticContactSoftness).toEqual({naturalFrequency:60,dampingRatio:10});
  expect(report.contactSettings[1]!.staticContactSoftness).toEqual({naturalFrequency:600,dampingRatio:10});
  report.contactSettings[0]!.staticContactSoftness.naturalFrequency=-1;
  report.contactSettings[1]!.contactSoftness.dampingRatio=-1;
  expect(p.snapshot().contactSettings[0]!.staticContactSoftness.naturalFrequency).toBe(60);
  expect(p.snapshot().contactSettings[1]!.contactSoftness.dampingRatio).toBe(10);
 }finally{w.free();}
 expect(p.snapshot().contactSettings[1]!.staticContactSoftness.naturalFrequency).toBe(600);
});
