use rapier3d::{dynamics::PendingIslandEvents, geometry::ContactManifold,prelude::*};
use rapier3d::parry::query::{DefaultQueryDispatcher,PersistentQueryDispatcher};
use serde_json::{json,Value};
use std::{fs,path::Path};
fn restore(bytes:&[u8])->PhysicsWorld {
 assert_eq!(&bytes[..12],b"ABSJS3DS\x01\x00\x00\x00");
 let(mut w,p):(PhysicsWorld,PendingIslandEvents)=bincode::deserialize(&bytes[12..]).unwrap();
 p.restore(&mut w.impulse_joints,&mut w.multibody_joints,&mut w.soft_bodies);w
}
fn summary(m:&ContactManifold)->Value {
 json!({"subshape1":m.subshape1,"subshape2":m.subshape2,"normal1":m.local_n1.to_array(),"normal2":m.local_n2.to_array(),"points":m.points.iter().map(|p|json!({"first":p.local_p1.to_array(),"second":p.local_p2.to_array(),"distance":p.dist})).collect::<Vec<_>>()})
}
fn main(){
 let args:Vec<_>=std::env::args().collect();assert_eq!(args.len(),3);let root=Path::new(&args[1]);
 let floor=ColliderHandle::from_raw_parts(0,0);let child=ColliderHandle::from_raw_parts(10,0);
 let after=restore(&fs::read(root.join("after.bin")).unwrap());
 let pair=after.narrow_phase.contact_pair(floor,child).unwrap();assert_eq!(pair.collider1,floor);
 let bad=pair.rigid().unwrap().manifolds.iter().min_by(|a,b|a.points.iter().map(|p|p.dist).fold(f32::INFINITY,f32::min).total_cmp(&b.points.iter().map(|p|p.dist).fold(f32::INFINITY,f32::min))).unwrap();
 let triangle_id=bad.subshape1;let mut rows=Vec::new();
 for state in ["before","after"] {
  let world=restore(&fs::read(root.join(format!("{state}.bin"))).unwrap());
  let a=&world.colliders[floor];let b=&world.colliders[child];
  let triangle=a.shape().as_heightfield().unwrap().triangle_at_id(triangle_id).unwrap();
  let pair=world.narrow_phase.contact_pair(floor,child).unwrap();
  let cached=pair.rigid().unwrap().manifolds.iter().find(|m|m.subshape1==triangle_id).unwrap();
  let current=world.bodies[b.parent().unwrap()].position()*b.position_wrt_parent().unwrap();
  for pose in ["collider","current-body"] {
   let pos12=a.position().inv_mul(if pose=="collider"{b.position()}else{&current});
   let fresh=rapier3d::parry::query::contact(a.position(),&triangle,if pose=="collider"{b.position()}else{&current},b.shape(),world.integration_parameters.prediction_distance()).unwrap();
   for seeded in [false,true] {
    let mut m=if seeded{cached.clone()}else{ContactManifold::new()};
    DefaultQueryDispatcher.contact_manifold_convex_convex(&pos12,&triangle,b.shape(),None,None,world.integration_parameters.prediction_distance(),&mut m).unwrap();
    rows.push(json!({"state":state,"pose":pose,"seeded":seeded,"triangleId":triangle_id,"triangle":[triangle.a.to_array(),triangle.b.to_array(),triangle.c.to_array()],"relativeTranslation":pos12.translation.to_array(),"relativeRotation":pos12.rotation.to_array(),"cached":summary(cached),"computed":summary(&m),"singleContact":fresh.as_ref().map(|c|json!({"distance":c.dist,"normal1":c.normal1.to_array(),"point1":c.point1.to_array(),"point2":c.point2.to_array()}))}));
   }
  }
 }
 fs::write(&args[2],serde_json::to_string_pretty(&json!({"scope":"Native fresh/seeded triangle-convex queries on exact captured states; solver units are centimetres","rows":rows})).unwrap()+"\n").unwrap();
}
