/** One-step, bounded public-API moving-patch reduction probe. */
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const R=(await import(resolve(process.argv[2]!))).default;
await R.init();
const w=new R.World({x:0,y:0,z:0});w.timestep=0.1;w.numSolverIterations=8;
try{
 const floor=w.createCollider(R.ColliderDesc.trimesh(new Float32Array([-5,0,-5,5,0,-5,-5,0,5,5,0,5]),new Uint32Array([0,2,1,1,2,3])).setFriction(0).setRestitution(0));
 const angle=0.07,center=0.01+Math.sin(angle)+0.05*Math.cos(angle);
 const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,center,0).setRotation({x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)}).setLinvel(0,-2,0));
 const box=w.createCollider(R.ColliderDesc.cuboid(1,0.05,1).setFriction(0).setRestitution(0),body);
 w.step();const geometric:any[]=[],solver:any[]=[];
 w.contactPair(floor,box,(m:any)=>{for(let i=0;i<m.numContacts();i++)geometric.push({normal:m.normal(),point:m.localContactPoint1(i),distance:m.contactDist(i)});});
 w.solverContactPair(floor,box,(m:any)=>{for(let i=0;i<m.numSolverContacts();i++)solver.push({normal:m.normal(),point:m.solverContactPoint1(i),distance:m.solverContactDist(i)});});
 const result={buildInfo:R.buildInfo,scope:'One fixed step, tilted cuboid translating toward two coplanar triangles; no CCD, friction or restitution',geometric,solver,translation:body.translation(),rotation:body.rotation(),linearVelocity:body.linvel(),angularVelocity:body.angvel()};
 writeFileSync(process.argv[3]!,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({geometric:geometric.length,solver:solver.length,xSupport:solver.map(p=>p.point?.x)},null,2));
}finally{w.free();}
