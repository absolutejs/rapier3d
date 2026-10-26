import R from '../../dist/rapier.mjs';
import {fixture} from '../tests/fixture';
try {
 await Promise.all([R.init(),R.init()]);
 const {w,a,b}=fixture(R);
 try {
  for(let i=0;i<650;i++)w.step();
  let original=0,solver=0,points=0;
  w.contactPair(a,b,m=>{original+=m.numSolverContacts();});
  w.solverContactPair(a,b,m=>{solver+=m.numSolverContacts();for(let i=0;i<m.numSolverContacts();i++){const p=m.solverContactPoint(i);const p1=m.solverContactPoint1(i),p2=m.solverContactPoint2(i),live=m.solverContactSeparation(i);if(!p||!p1||!p2||live===null||![p.x,p.y,p.z,p1.x,p1.y,p1.z,p2.x,p2.y,p2.z,live,m.solverContactDist(i)].every(Number.isFinite))throw Error('Invalid live solver point');points++;}});
  if(original!==0||solver===0)throw Error('Cluster fixture did not distinguish query sources');
  if(w.integrationParameters.contactClustering!==true)throw Error('Default clustering changed');
  w.integrationParameters.contactClustering=false;
  if(w.integrationParameters.contactClustering!==false)throw Error('Clustering control did not apply');
  w.integrationParameters.minCcdDt=1/960/100;
  if(Math.abs(w.integrationParameters.minCcdDt-1/960/100)>1e-10)throw Error('CCD minimum setter failed');
  const restored=R.World.restoreSnapshot(w.takeSnapshot());
  try { if(restored.getCollider(0).parent()!==null)throw Error('Restored floor aliases body zero');if(restored.getCollider(a.handle).parent()?.handle!==a.parent()?.handle)throw Error('Restored moving owner changed'); } finally {restored.free();}
  postMessage({restoredOwners:true,passed:true,version:R.version(),original,solver,points,liveAnchors:true,clusteringControl:true,ccdMinimumControl:true});
 }finally{w.free();}
}catch(error){postMessage({passed:false,error:String(error)});}
