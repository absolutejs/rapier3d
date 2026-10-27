export type V=[number,number,number];export type Q=[number,number,number,number];
export type Frame={frame:number;w:V;q:Q;angularVelocityError:number;orientationErrorRad:number;relativeMomentumError:number;relativeEnergyError:number;relativeEnergyGain:number;speedCapConfounded:boolean};
const add=(a:V,b:V):V=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale=(a:V,s:number):V=>a.map(x=>x*s) as V;
const dot=(a:V,b:V)=>a.reduce((s,x,i)=>s+x*b[i]!,0);
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=(v:number[])=>Math.hypot(...v);
const unit=(q:Q)=>q.map(v=>v/norm(q)) as Q;
const inverse=(q:Q):Q=>[-q[0],-q[1],-q[2],q[3]];
function product(a:Q,b:Q):Q{const v=add(add(scale(b.slice(0,3) as V,a[3]),scale(a.slice(0,3) as V,b[3])),cross(a.slice(0,3) as V,b.slice(0,3) as V));return [...v,a[3]*b[3]-dot(a.slice(0,3) as V,b.slice(0,3) as V)];}
const rotate=(q:Q,v:V)=>product(product(q,[...v,0]),inverse(q)).slice(0,3) as V;
const vector=(v:{x:number;y:number;z:number}):V=>[v.x,v.y,v.z];
const quaternion=(q:{x:number;y:number;z:number;w:number}):Q=>unit([q.x,q.y,q.z,q.w]);
const angle=(a:Q,b:Q)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,i)=>s+x*b[i]!,0))));
const multiply=(a:V,b:V)=>a.map((x,i)=>x*b[i]!) as V;
function exact(w:V,t:number):Q{const speed=norm(w);return speed===0?[0,0,0,1]:[...scale(w,Math.sin(speed*t/2)/speed),Math.cos(speed*t/2)];}
function reference(inertia:V,w:V,hz:number,frequency:number){
 let state:number[]=[...w,0,0,0,1];const rows=[];
 const derivative=(s:number[])=>{const angular=s.slice(0,3) as V,q=s.slice(3) as Q,torque=cross(multiply(inertia,angular),angular);return [...torque.map((x,i)=>x/inertia[i]!),...product(q,[...angular,0]).map(x=>x*.5)];};
 const substeps=frequency/hz;if(!Number.isInteger(substeps))throw Error('Reference grid must align with samples');
 const dt=1/frequency;
 for(let frame=1;frame<=hz/10;frame++){
  for(let j=0;j<substeps;j++){
   const k1=derivative(state),k2=derivative(state.map((x,i)=>x+dt*k1[i]!/2)),k3=derivative(state.map((x,i)=>x+dt*k2[i]!/2)),k4=derivative(state.map((x,i)=>x+dt*k3[i]!));
   state=state.map((x,i)=>x+dt*(k1[i]!+2*k2[i]!+2*k3[i]!+k4[i]!)/6);state.splice(3,4,...unit(state.slice(3) as Q));
  }
  rows.push({w:state.slice(0,3) as V,q:state.slice(3) as Q});
 }
 return rows;
}

export {add,scale,dot,cross,norm,unit,inverse,product,rotate,vector,quaternion,angle,multiply,exact,reference};
