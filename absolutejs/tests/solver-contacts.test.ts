import { beforeAll, expect, test } from 'bun:test';
import R from '../../dist/rapier.mjs';
import upstream from '@dimforge/rapier3d-compat';
beforeAll(async()=>{await Promise.all([R.init(),R.init(),upstream.init()]);});
function fixture(api: typeof upstream, hz=960, tilt=0) {
 const w=new api.World({x:0,y:-981,z:0});w.timestep=1/hz;
 w.integrationParameters.lengthUnit=100;w.integrationParameters.normalizedAllowedLinearError=.00001;w.integrationParameters.normalizedPredictionDistance=.002;w.integrationParameters.contact_natural_frequency=240;w.integrationParameters.maxCcdSubsteps=4;
 w.createCollider(api.ColliderDesc.cuboid(2000,100,2000).setTranslation(0,-100,0).setFriction(.7).setRestitution(.1));
 const q={x:Math.sin(tilt/2),y:0,z:0,w:Math.cos(tilt/2)};
 const make=(mass:number,inertia:number)=>w.createRigidBody(api.RigidBodyDesc.dynamic().setTranslation(0,200,0).setRotation(q).setCcdEnabled(true).setAdditionalSolverIterations(32).setAdditionalMassProperties(mass,{x:0,y:0,z:0},{x:inertia*1e4,y:inertia*1e4,z:inertia*1e4},{x:0,y:0,z:0,w:1}));
 const m=600*.02**3,M=600*.04**3;
 const chip=make(m,m*.02**2/6),shell=make(M-m,(M*.04**2-m*.02**2)/6);
 const a=w.createCollider(api.ColliderDesc.cuboid(1,1,1).setDensity(0).setFriction(.7).setRestitution(.1),chip);
 const sizes=[[.5,2,2],[.5,2,2],[1,.5,2],[1,.5,2],[1,1,.5],[1,1,.5]];
 const positions=[{x:-1.5,y:0,z:0},{x:1.5,y:0,z:0},{x:0,y:-1.5,z:0},{x:0,y:1.5,z:0},{x:0,y:0,z:-1.5},{x:0,y:0,z:1.5}];
 const b=w.createCollider(api.ColliderDesc.compound(sizes.map(s=>api.ColliderDesc.cuboid(s[0]!,s[1]!,s[2]!).shape),positions,sizes.map(()=>({x:0,y:0,z:0,w:1}))).setDensity(0).setFriction(.7).setRestitution(.1),shell);
 return {w,a,b,bodies:[chip,shell]};
}
test('clustered solver contacts are exposed separately from original geometry',()=>{
 const {w,a,b}=fixture(R);
 try {
  let geometric=0, originalSolver=0, actualSolver=0;
  for(let i=0;i<800;i++) {
   w.step();
   w.contactPair(a,b,m=>{geometric+=m.numContacts();originalSolver+=m.numSolverContacts();});
   w.solverContactPair(a,b,m=>{actualSolver+=m.numSolverContacts();for(let j=0;j<m.numSolverContacts();j++){expect(Number.isFinite(m.solverContactDist(j))).toBe(true);expect(m.solverContactPoint(j)).not.toBeNull();}});
  }
  expect(geometric).toBeGreaterThan(0);expect(originalSolver).toBe(0);expect(actualSolver).toBeGreaterThan(0);
 }finally{w.free();}
});
test('query is reentrant, preserves argument flipping, and frees views after throws',()=>{
 const {w,a,b}=fixture(R);try {
  for(let i=0;i<650;i++)w.step();
  const read=(x:any,y:any)=>{const rows:any[]=[];w.solverContactPair(x,y,(m:any,flipped:boolean)=>rows.push({flipped,count:m.numSolverContacts(),normal:m.normal()}));return rows;};
  const forward=read(a,b),reverse=read(b,a);expect(forward.length).toBeGreaterThan(0);expect(reverse.length).toBe(forward.length);expect(reverse[0].flipped).toBe(!forward[0].flipped);
  let nested=0;w.solverContactPair(a,b,m=>{const n=m.numSolverContacts();nested+=read(a,b).length;expect(m.numSolverContacts()).toBe(n);});expect(nested).toBeGreaterThan(0);
  expect(()=>w.solverContactPair(a,b,()=>{throw Error('callback sentinel');})).toThrow('callback sentinel');expect(read(a,b)).toEqual(forward);
 }finally{w.free();}
});
for(const hz of [960,1920])for(const tilt of [0,.3]) test(`query-only build preserves upstream motion ${hz}Hz tilt=${tilt}`,()=>{
 const a=fixture(R,hz,tilt),b=fixture(upstream,hz,tilt);try{
  for(let i=0;i<2*hz;i++) {a.w.step();b.w.step();a.w.solverContactPair(a.a,a.b,()=>{});
   if(i%120===0) for(let k=0;k<2;k++) {expect(a.bodies[k]!.translation()).toEqual(b.bodies[k]!.translation());expect(a.bodies[k]!.rotation()).toEqual(b.bodies[k]!.rotation());expect(a.bodies[k]!.linvel()).toEqual(b.bodies[k]!.linvel());}
  }
 }finally{a.w.free();b.w.free();}
});
