use rapier3d::{dynamics::{PendingIslandEvents,FrictionModel},prelude::*};
use serde_json::json;
use std::fs;
fn restore(bytes:&[u8])->PhysicsWorld{
 assert_eq!(&bytes[..12],b"ABSJS3DS\x01\x00\x00\x00");
 let(mut w,p):(PhysicsWorld,PendingIslandEvents)=bincode::deserialize(&bytes[12..]).unwrap();
 p.restore(&mut w.impulse_joints,&mut w.multibody_joints,&mut w.soft_bodies);w
}
fn body_rows(w:&PhysicsWorld)->serde_json::Value{
 json!(w.bodies.iter().map(|(h,b)|json!({"handle":h.into_raw_parts(),"position":b.position(),"linearVelocity":b.linvel().to_array(),"angularVelocity":b.angvel().to_array()})).collect::<Vec<_>>())
}
fn main(){
 let args:Vec<_>=std::env::args().collect();assert_eq!(args.len(),3);
 let input=fs::read(&args[1]).unwrap();let mut rows=Vec::new();
 for mode in ["default","coulomb","no-warmstart","pgs-8","no-friction","no-restitution"]{
  let mut w=restore(&input);
  match mode{
   "coulomb"=>w.integration_parameters.friction_model=FrictionModel::Coulomb,
   "no-warmstart"=>w.integration_parameters.warmstart_coefficient=0.0,
   "pgs-8"=>w.integration_parameters.num_internal_pgs_iterations=8,
   "no-friction"=>{for(_,c)in w.colliders.iter_mut(){c.set_friction(0.0);}},
   "no-restitution"=>{for(_,c)in w.colliders.iter_mut(){c.set_restitution(0.0);}},
   _=>{}
  }
  let params=json!(w.integration_parameters);let mut samples=Vec::new();
  for step in 881..=912{
   w.step();let mut pairs=Vec::new();
   for raw in 1..=15{
    let a=ColliderHandle::from_raw_parts(0,0);let b=ColliderHandle::from_raw_parts(raw,0);
    if let Some(pair)=w.narrow_phase.contact_pair(a,b){if let Some(r)=pair.rigid(){
     let manifolds:Vec<_>=r.manifolds.iter().filter(|m|!m.points.is_empty()).collect();
     let clusters:Vec<_>=r.solver_clusters.iter().filter(|m|!m.data.solver_contacts.is_empty()).collect();
     if !manifolds.is_empty()||!clusters.is_empty(){pairs.push(json!({"collider":raw,"manifolds":manifolds,"clusters":clusters}));}
    }}
   }
   samples.push(json!({"step":step,"bodies":body_rows(&w),"pairs":pairs}));
  }
  rows.push(json!({"mode":mode,"parameters":params,"samples":samples}));
 }
 fs::write(&args[2],serde_json::to_string_pretty(&json!({"scope":"Native diagnostic ablations; no WASM byte-identity or production-setting claim","rows":rows})).unwrap()+"\n").unwrap();
}
