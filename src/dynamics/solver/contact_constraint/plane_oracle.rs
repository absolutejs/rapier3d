//! PRIVATE RESEARCH ONLY: explicit tagged radius-0.1 sphere / prescribed plane oracle.
//! Not a general contact algorithm; user-data tags are set only by the research fixture.
use crate::dynamics::{RigidBodySet};
use crate::dynamics::solver::solver_body::SolverBodies;
use crate::geometry::ContactManifold;
use crate::math::{Real, Vector, SIMD_WIDTH};

pub(super) const PLANE_TAG: u128 = 0x41505031;
pub(super) const SPHERE_TAG: u128 = 0x41505331;

pub(super) fn roles(manifolds: [&ContactManifold; SIMD_WIDTH], bodies: &RigidBodySet) -> [i8; SIMD_WIDTH] {
    core::array::from_fn(|i| {
        let m = &manifolds[i].data;
        let Some(a) = m.rigid_body1.and_then(|h| bodies.get(h)) else { return 0 };
        let Some(b) = m.rigid_body2.and_then(|h| bodies.get(h)) else { return 0 };
        let role = if a.user_data == PLANE_TAG && b.user_data == SPHERE_TAG && a.is_kinematic() && b.is_dynamic() { 1 }
            else if b.user_data == PLANE_TAG && a.user_data == SPHERE_TAG && b.is_kinematic() && a.is_dynamic() { -1 }
            else { return 0 };
        assert!(m.friction == 0.0 && m.restitution == 0.0 && m.num_active_contacts() == 1,
            "Plane oracle requires one frictionless, nonbouncy contact");
        role
    })
}

#[derive(Copy, Clone, Default)]
pub(super) struct Sample {
    pub dir1: Vector,
    pub torque1: Vector,
    pub torque2: Vector,
    pub distance: Real,
}

pub(super) fn sample(role: i8, id1: u32, id2: u32, bodies: &SolverBodies) -> Sample {
    if role == 0 { return Sample::default() }
    assert!(id1 != u32::MAX && id2 != u32::MAX, "Tagged oracle body missing from solver");
    let (plane, sphere) = if role == 1 { (bodies.get_pose(id1), bodies.get_pose(id2)) }
        else { (bodies.get_pose(id2), bodies.get_pose(id1)) };
    let n = plane.rotation * Vector::new(0.0, 1.0, 0.0);
    let d = sphere.translation - plane.translation;
    // The fixture uses a cuboid with half-extents (20,.05,.5), no collider offset.
    // A lane must remain in its broad-face interior; do not silently extend the plane.
    let local = plane.rotation.inverse() * d;
    assert!(local.x.abs() < 19.9 && local.z.abs() < 0.4 && local.y > 0.0,
        "Plane oracle left the upper broad-face domain");
    let torque = n.cross(d);
    Sample { dir1: if role == 1 { -n } else { n },
        torque1: if role == 1 { torque } else { Vector::ZERO },
        torque2: if role == -1 { torque } else { Vector::ZERO },
        distance: n.dot(d) - 0.15 }
}
