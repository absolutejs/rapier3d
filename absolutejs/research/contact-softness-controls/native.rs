use rapier3d::{dynamics::{PendingIslandEvents,FrictionModel},prelude::*};
fn restore(bytes:&[u8])->PhysicsWorld{
 let(mut w,p):(PhysicsWorld,PendingIslandEvents)=bincode::deserialize(&bytes[12..]).unwrap();
 p.restore(&mut w.impulse_joints,&mut w.multibody_joints,&mut w.soft_bodies);w
}
#[test]
fn fixed_contact_does_not_depend_on_dynamic_softness_for_either_friction_model(){
 let bytes=include_bytes!("../../tests/fixtures/terrain-contact-softness-before.bin");
 for model in [FrictionModel::Simplified,FrictionModel::Coulomb]{
  let mut a=restore(bytes);a.integration_parameters.friction_model=model;
  let mut b=restore(bytes);b.integration_parameters.friction_model=model;
  b.integration_parameters.contact_softness.natural_frequency=600.0;
  for step in 0..32{
   a.step();b.step();
   let a_body=&a.bodies[RigidBodyHandle::from_raw_parts(0,0)];
   let b_body=&b.bodies[RigidBodyHandle::from_raw_parts(0,0)];
   assert_eq!(a_body.position(),b_body.position(),"model={model:?} step={step}");
   assert_eq!(a_body.linvel(),b_body.linvel(),"model={model:?} step={step}");
   assert_eq!(a_body.angvel(),b_body.angvel(),"model={model:?} step={step}");
  }
 }
}
