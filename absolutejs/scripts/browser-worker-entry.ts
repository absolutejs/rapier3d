import R from '../../dist/rapier.mjs';
import {fixture} from '../tests/fixture';
try {
 await Promise.all([R.init(),R.init()]);
 const {w,a,b}=fixture(R);
 try {
  for(let i=0;i<650;i++)w.step();
  let original=0,solver=0,points=0;
  w.contactPair(a,b,m=>{original+=m.numSolverContacts();});
  w.solverContactPair(a,b,m=>{solver+=m.numSolverContacts();for(let i=0;i<m.numSolverContacts();i++){const p=m.solverContactPoint(i);if(!p||![p.x,p.y,p.z,m.solverContactDist(i)].every(Number.isFinite))throw Error('Invalid solver point');points++;}});
  if(original!==0||solver===0)throw Error('Cluster fixture did not distinguish query sources');
  postMessage({passed:true,version:R.version(),original,solver,points});
 }finally{w.free();}
}catch(error){postMessage({passed:false,error:String(error)});}
