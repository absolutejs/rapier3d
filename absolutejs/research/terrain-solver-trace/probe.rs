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
 let args:Vec<_>=std::env::args().collect();assert!(args.len()==3||args.len()==6);
 let long=args.len()==6;let first:u32=if long{args[3].parse().unwrap()}else{881};let last:u32=if long{args[4].parse().unwrap()}else{912};let stride:u32=if long{args[5].parse().unwrap()}else{1};assert!(stride>0&&last>=first&&last-first<=20000);
 let input=fs::read(&args[1]).unwrap();let mut rows=Vec::new();
 let modes:Vec<&str>=if long{vec!["default","coulomb","static-600hz","static-1mhz"]}else{vec!["default","coulomb","no-warmstart","pgs-8","no-friction","no-restitution","static-120hz","static-240hz","static-600hz","static-1mhz"]};
 for mode in modes{
  let mut w=restore(&input);
  match mode{
   "coulomb"=>w.integration_parameters.friction_model=FrictionModel::Coulomb,
   "no-warmstart"=>w.integration_parameters.warmstart_coefficient=0.0,
   "pgs-8"=>w.integration_parameters.num_internal_pgs_iterations=8,
   "no-friction"=>{for(_,c)in w.colliders.iter_mut(){c.set_friction(0.0);}},
   "no-restitution"=>{for(_,c)in w.colliders.iter_mut(){c.set_restitution(0.0);}},
   "static-120hz"=>w.integration_parameters.static_contact_softness.natural_frequency=120.0,
   "static-240hz"=>w.integration_parameters.static_contact_softness.natural_frequency=240.0,
   "static-600hz"=>w.integration_parameters.static_contact_softness.natural_frequency=600.0,
   "static-1mhz"=>w.integration_parameters.static_contact_softness.natural_frequency=1.0e6,
   _=>{}
  }
  let params=json!(w.integration_parameters);let mut samples=Vec::new();
  for step in first..=last{
   w.step();let sleeping=w.bodies.iter().all(|(_,b)|b.is_sleeping());if step%stride!=0&&step!=first&&step!=last&&!sleeping{continue;}
   let mut pairs=Vec::new();
   if !long{for raw in 1..=15{
    let a=ColliderHandle::from_raw_parts(0,0);let b=ColliderHandle::from_raw_parts(raw,0);
    if let Some(pair)=w.narrow_phase.contact_pair(a,b){if let Some(r)=pair.rigid(){
     let manifolds:Vec<_>=r.manifolds.iter().filter(|m|!m.points.is_empty()).collect();
     let clusters:Vec<_>=r.solver_clusters.iter().filter(|m|!m.data.solver_contacts.is_empty()).collect();
     if !manifolds.is_empty()||!clusters.is_empty(){pairs.push(json!({"collider":raw,"manifolds":manifolds,"clusters":clusters}));}
    }}
   }
   }
   samples.push(json!({"step":step,"sleeping":sleeping,"bodies":body_rows(&w),"pairs":pairs}));
   if sleeping{break;}
  }
  rows.push(json!({"mode":mode,"parameters":params,"samples":samples}));
 }
 fs::write(&args[2],serde_json::to_string_pretty(&json!({"scope":"Native diagnostic ablations; no WASM byte-identity or production-setting claim","rows":rows})).unwrap()+"\n").unwrap();
}
