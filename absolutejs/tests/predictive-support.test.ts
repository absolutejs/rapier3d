import {beforeAll,expect,test} from 'bun:test';
import R from '../../dist/rapier.mjs';
import {predictiveSupportFixture as fixture,predictiveSupport as support} from './predictive-support-fixture';
beforeAll(async()=>{await R.init();});
for(const scale of [.01,1,100])for(const reverse of [false,true])test(`predicted support spans approaching patch scale=${scale} reverse=${reverse}`,()=>{
 const {w,floor,box}=fixture(R,scale,-2,reverse);try{
  w.step();const {geometric,points}=support(w,floor,box);
  expect(geometric).toBeGreaterThan(4);expect(points.length).toBe(4);
  expect(Math.min(...points.map(p=>p.x))/scale).toBeLessThan(-.9);
  expect(Math.max(...points.map(p=>p.x))/scale).toBeGreaterThan(.9);
  for(const p of points)expect(Math.abs(p.y)/scale).toBeLessThan(1e-4);
 }finally{w.free();}
});
for(const speed of [0,2])test(`nonapproaching outer support stays outside prediction speed=${speed}`,()=>{
 const {w,floor,box}=fixture(R,1,speed);try{
  w.step();const {geometric,points}=support(w,floor,box);
  expect(geometric).toBeGreaterThan(4);expect(points.length).toBeGreaterThan(0);
  expect(Math.max(...points.map(p=>p.x))).toBeLessThan(-.9);
 }finally{w.free();}
});
test('predicted support snapshot restores and replays exactly',()=>{
 const {w}=fixture(R);let replay:any;try{
  const input=w.takeSnapshot();replay=R.World.restoreSnapshot(input);
  expect(replay.takeSnapshot()).toEqual(input);w.step();replay.step();
  expect(replay.takeSnapshot()).toEqual(w.takeSnapshot());
 }finally{replay?.free();w.free();}
});
