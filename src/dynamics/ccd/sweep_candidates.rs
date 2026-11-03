//! Ephemeral external candidates for one body's sweep. No cross-step state.
use crate::alloc_prelude::*;
use crate::dynamics::RigidBodyHandle;
use crate::geometry::{ColliderHandle, ColliderSet};
use crate::parry::{
    bounding_volume::{Aabb, BoundingVolume},
    partitioning::Bvh,
};

pub(super) const MAX_BODY_SWEEP_TARGETS: usize = 512;

/// Preserve the BVH's left-first leaf order and its stored conservative bounds.
/// Filtering this list by any AABB contained in `envelope` gives exactly the
/// original per-piece query order (assuming the BVH's parent containment invariant).
/// The only early filter is same-body ownership, which precedes all user hooks.
/// Overflow returns None, never a truncated collision neighborhood.
pub(super) fn collect_external_sweep_candidates(
    bvh: &Bvh,
    colliders: &ColliderSet,
    body: RigidBodyHandle,
    envelope: Aabb,
) -> Option<Vec<(ColliderHandle, Aabb)>> {
    if !envelope.mins.is_finite() || !envelope.maxs.is_finite() {
        return None;
    }
    let mut candidates = Vec::new();
    for key in bvh.leaves(|node| node.aabb().intersects(&envelope)) {
        #[cfg(feature = "sweep-probe")]
        crate::counters::sweep_probe::add(15, 1);
        let Some((co, handle)) = colliders.get_unknown_gen(key) else {
            continue;
        };
        if co.parent() == Some(body) {
            continue;
        }
        if candidates.len() == MAX_BODY_SWEEP_TARGETS {
            return None;
        }
        // Do not replace this with a fresh geometry AABB: the stored leaf may
        // include motion/prediction padding needed by the original CCD query.
        candidates.push((handle, bvh.leaf_node(key)?.aabb()));
    }
    Some(candidates)
}
