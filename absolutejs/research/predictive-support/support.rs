//! Exact production reducer source with Parry's real manifold type and unit user-data.
mod geometry { pub type ContactManifold = parry3d::query::ContactManifold<(), ()>; }
mod math { pub use parry3d::math::Real; }
#[path="../../../src/geometry/manifold_reduction.rs"] mod manifold_reduction;
use parry3d::{math::Vector,query::TrackedContact,shape::PackedFeatureId};
#[test]
fn approaching_tilted_patch_retains_its_future_support_extent() {
 let mut m=geometry::ContactManifold::new();m.local_n1=Vector::Y;m.local_n2=-Vector::Y;
 for (x,z) in [(0.0,0.0),(4.0,0.0),(0.0,4.0),(0.1,0.0),(0.0,0.1)] {
  let gap=1.0+0.5*(x+z);
  m.points.push(TrackedContact::new(Vector::new(x,0.0,z),Vector::new(x,gap,z),PackedFeatureId::UNKNOWN,PackedFeatureId::UNKNOWN,gap));
 }
 // The whole tilted face moves down by 2 units this step. Both outer corners
 // are inside the prediction margin at the end, so the caller accepts them.
 let prediction=2.0;let dt=0.1;let normal_speed=-20.0;
 assert!(m.points[1].dist+normal_speed*dt<prediction);
 assert!(m.points[2].dist+normal_speed*dt<prediction);
 let mut selected=[0,1,2,3];let mut count=4;
 manifold_reduction::reduce_manifold_naive(&m,&mut selected,&mut count,|i| m.points[i].dist < prediction || m.points[i].dist+normal_speed*dt<prediction);
 assert!(selected[..count].contains(&1),"future x support lost: {:?}",&selected[..count]);
 assert!(selected[..count].contains(&2),"future z support lost: {:?}",&selected[..count]);
}

fn patch() -> geometry::ContactManifold {
 let mut m=geometry::ContactManifold::new();m.local_n1=Vector::Y;m.local_n2=-Vector::Y;
 for (x,z) in [(0.0,0.0),(4.0,0.0),(0.0,4.0),(0.1,0.0),(0.0,0.1)] {
  let gap=1.0+0.5*(x+z);
  m.points.push(TrackedContact::new(Vector::new(x,0.0,z),Vector::new(x,gap,z),PackedFeatureId::UNKNOWN,PackedFeatureId::UNKNOWN,gap));
 }
 m
}
#[test]
fn stationary_and_receding_points_outside_margin_stay_excluded() {
 for speed in [0.0,20.0] {
  let m=patch();let mut selected=[0;4];let mut count=4;
  manifold_reduction::reduce_manifold_naive(&m,&mut selected,&mut count,|i|m.points[i].dist<2.0 || m.points[i].dist+speed*0.1<2.0);
  assert_eq!(count,3);assert_eq!(&selected[..count],&[0,3,4]);
 }
}
#[test]
fn contact_skin_eligibility_is_not_discarded_by_raw_distance() {
 let m=patch();let mut selected=[0;4];let mut count=4;
 manifold_reduction::reduce_manifold_naive(&m,&mut selected,&mut count,|i|m.points[i].dist-1.5<2.0);
 assert!(selected[..count].contains(&1));assert!(selected[..count].contains(&2));
}
#[test]
fn no_eligible_contacts_and_small_manifolds_obey_the_same_filter() {
 let mut m=patch();let mut selected=[0;4];let mut count=4;
 manifold_reduction::reduce_manifold_naive(&m,&mut selected,&mut count,|_|false);assert_eq!(count,0);
 m.points.truncate(3);
 manifold_reduction::reduce_manifold_naive(&m,&mut selected,&mut count,|i|i==2);assert_eq!(count,1);assert_eq!(selected[0],2);
}
#[test]
fn moving_patch_support_extents_survive_permuted_contact_order() {
 for reversed in [false,true] {for shift in 0..5 {
  let mut m=patch();if reversed{m.points.reverse();}m.points.rotate_left(shift);
  let mut selected=[0;4];let mut count=4;
  manifold_reduction::reduce_manifold_naive(&m,&mut selected,&mut count,|i|m.points[i].dist-2.0<2.0);
  let retained:Vec<_>=selected[..count].iter().map(|i|m.points[*i].local_p1).collect();
  assert!(retained.contains(&Vector::new(4.0,0.0,0.0)));
  assert!(retained.contains(&Vector::new(0.0,0.0,4.0)));
  assert!(retained.contains(&Vector::ZERO));
 }}
}
