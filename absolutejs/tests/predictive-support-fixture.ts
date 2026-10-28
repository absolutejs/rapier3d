/** Analytic tilted bottom face, initially 0.01..0.15 units above a flat mesh.
 * At speed -2 and dt .1 both outer edges enter the prediction interval. */
export function predictiveSupportFixture(R:any,scale=1,speed=-2,reverse=false){
 const w=new R.World({x:0,y:0,z:0});w.timestep=.1;w.numSolverIterations=8;w.lengthUnit=scale;
 const makeFloor=()=>w.createCollider(R.ColliderDesc.trimesh(new Float32Array([-5,0,-5,5,0,-5,-5,0,5,5,0,5].map(v=>v*scale)),new Uint32Array([0,2,1,1,2,3])).setFriction(0).setRestitution(0));
 const makeBox=()=>{
  const angle=.07,center=(.01+Math.sin(angle)+.05*Math.cos(angle))*scale;
  const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,center,0).setRotation({x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)}).setLinvel(0,speed*scale,0));
  return w.createCollider(R.ColliderDesc.cuboid(scale,.05*scale,scale).setFriction(0).setRestitution(0),body);
 };
 let floor,box;if(reverse){box=makeBox();floor=makeFloor();}else{floor=makeFloor();box=makeBox();}
 return {w,floor,box};
}
export function predictiveSupport(w:any,floor:any,box:any){
 let geometric=0;const points:{x:number,y:number,z:number}[]=[];
 w.contactPair(floor,box,(m:any)=>{geometric+=m.numContacts();});
 w.solverContactPair(floor,box,(m:any,flipped:boolean)=>{for(let i=0;i<m.numSolverContacts();i++)points.push(flipped?m.solverContactPoint2(i):m.solverContactPoint1(i));});
 return {geometric,points};
}
