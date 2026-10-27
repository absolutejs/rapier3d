//! PRIVATE RESEARCH ONLY: explicit tagged radius-0.1 sphere / prescribed plane oracle.
//! Not a general contact algorithm; user-data tags are set only by the research fixture.
use crate::dynamics::{RigidBodySet};
use crate::dynamics::solver::solver_body::SolverBodies;
use crate::geometry::ContactManifold;
use crate::math::{Real, Vector, SIMD_WIDTH};

pub(super) const PLANE_TAG: u128 = 0x41505031;
pub(super) const BOX20_TAG: u128 = 0x41504214;
pub(super) const BOX2_TAG: u128 = 0x41504202;
pub(super) const SPHERE_TAG: u128 = 0x41505331;

pub(super) fn roles(manifolds: [&ContactManifold; SIMD_WIDTH], bodies: &RigidBodySet) -> [i8; SIMD_WIDTH] {
    core::array::from_fn(|i| {
        let m = &manifolds[i].data;
        let Some(a) = m.rigid_body1.and_then(|h| bodies.get(h)) else { return 0 };
        let Some(b) = m.rigid_body2.and_then(|h| bodies.get(h)) else { return 0 };
        let shape_role = |tag| if tag == PLANE_TAG { 1 } else if tag == BOX20_TAG { 2 } else if tag == BOX2_TAG { 3 } else { 0 };
        let role = if shape_role(a.user_data) != 0 && b.user_data == SPHERE_TAG && a.is_kinematic() && b.is_dynamic() { shape_role(a.user_data) }
            else if shape_role(b.user_data) != 0 && a.user_data == SPHERE_TAG && b.is_kinematic() && a.is_dynamic() { -shape_role(b.user_data) }
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
    let (plane, sphere) = if role > 0 { (bodies.get_pose(id1), bodies.get_pose(id2)) }
        else { (bodies.get_pose(id2), bodies.get_pose(id1)) };
    let d = sphere.translation - plane.translation;
    let local = plane.rotation.inverse() * d;
    let (n, distance) = if role.abs() == 1 {
        assert!(local.x.abs() < 19.9 && local.z.abs() < 0.4 && local.y > 0.0,
            "Plane oracle left the upper broad-face domain");
        let n = plane.rotation * Vector::new(0.0, 1.0, 0.0);
        (n, n.dot(d) - 0.15)
    } else {
        // Exact finite-box closest feature; no cuboid-as-infinite-plane extension.
        let half = Vector::new(if role.abs() == 2 { 20.0 } else { 2.0 }, 0.05, 0.5);
        let closest = local.clamp(-half, half);
        let offset = local - closest;
        let length = offset.length();
        let (normal, separation) = if length > 0.0 {
            (offset / length, length - 0.1)
        } else {
            // Interior: nearest outward face, with deterministic ties.
            let gaps = half - local.abs();
            let axis = if gaps.x <= gaps.y && gaps.x <= gaps.z { 0 } else if gaps.y <= gaps.z { 1 } else { 2 };
            let mut normal = Vector::ZERO;
            normal[axis] = if local[axis] < 0.0 { -1.0 } else { 1.0 };
            (normal, -gaps[axis] - 0.1)
        };
        (plane.rotation * normal, separation)
    };
    // Envelope derivative: the closest-point tangential derivative drops out.
    let torque = n.cross(d);
    Sample { dir1: if role > 0 { -n } else { n },
        torque1: if role > 0 { torque } else { Vector::ZERO },
        torque2: if role < 0 { torque } else { Vector::ZERO },
        distance }
}
