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
 manifold_reduction::reduce_manifold_naive(&m,&mut selected,&mut count,prediction);
 assert!(selected[..count].contains(&1),"future x support lost: {:?}",&selected[..count]);
 assert!(selected[..count].contains(&2),"future z support lost: {:?}",&selected[..count]);
}
