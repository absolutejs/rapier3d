//! Pending connectivity edits are logical state, unlike rebuildable solver caches.
use crate::alloc_prelude::*;
use crate::dynamics::soft_body::SoftBodyIslandEvent;
#[cfg(feature = "serde-serialize")]
use crate::dynamics::RigidBodyHandle;
use crate::dynamics::{
    ImpulseJointHandle, ImpulseJointIslandEvent, ImpulseJointSet, MultibodyIndex,
    MultibodyJointSet, SoftBodySet,
};
#[cfg(feature = "serde-serialize")]
use parry::utils::hashset::HashSet;

/// Unordered wake membership has one canonical wire order. The enhanced
/// determinism feature already uses an insertion-ordered set, which retains
/// its existing wire/consumption order.
#[cfg(feature = "serde-serialize")]
pub(crate) fn serialize_wake_set<S: serde::Serializer>(
    set: &HashSet<RigidBodyHandle>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    #[cfg(feature = "enhanced-determinism")]
    {
        serde::Serialize::serialize(set, serializer)
    }
    #[cfg(not(feature = "enhanced-determinism"))]
    {
        let mut handles: Vec<_> = set.iter().collect();
        handles.sort_unstable_by_key(|handle| handle.into_raw_parts());
        serde::Serialize::serialize(&handles, serializer)
    }
}

#[cfg(feature = "serde-serialize")]
pub(crate) fn serialize_join_set<S: serde::Serializer>(
    set: &HashSet<(RigidBodyHandle, RigidBodyHandle)>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    #[cfg(feature = "enhanced-determinism")]
    {
        serde::Serialize::serialize(set, serializer)
    }
    #[cfg(not(feature = "enhanced-determinism"))]
    {
        let mut pairs: Vec<_> = set.iter().collect();
        pairs.sort_unstable_by_key(|(a, b)| (a.into_raw_parts(), b.into_raw_parts()));
        serde::Serialize::serialize(&pairs, serializer)
    }
}

/// Opaque checkpoint of connectivity edits not yet consumed by a simulation step.
///
/// Save and restore this together with the matching body, joint, soft-body and
/// island sets. Their ordinary serialization omits these deferred queues. Event
/// order and removed handles must be retained; rebuilding only current joints
/// cannot reproduce a pending removal. Solver caches are deliberately excluded.
#[derive(Clone, Debug, Default)]
#[cfg_attr(feature = "serde-serialize", derive(Serialize, Deserialize))]
pub struct PendingIslandEvents {
    impulse: Vec<ImpulseJointIslandEvent>,
    impulse_modified: Vec<ImpulseJointHandle>,
    impulse_all_modified: bool,
    multibody: Vec<MultibodyIndex>,
    soft_body: Vec<SoftBodyIslandEvent>,
}

impl PendingIslandEvents {
    /// Copy pending edits without flushing queues or changing simulation state.
    pub fn capture(
        impulse: &ImpulseJointSet,
        multibody: &MultibodyJointSet,
        soft_body: &SoftBodySet,
    ) -> Self {
        Self {
            impulse: impulse.island_events.clone(),
            impulse_modified: impulse.modified_joints.clone(),
            impulse_all_modified: impulse.all_joints_modified,
            multibody: multibody.island_chain_events.clone(),
            soft_body: soft_body.island_events.clone(),
        }
    }

    /// Restore the exact queues alongside the corresponding deserialized sets.
    pub fn restore(
        self,
        impulse: &mut ImpulseJointSet,
        multibody: &mut MultibodyJointSet,
        soft_body: &mut SoftBodySet,
    ) {
        impulse.island_events = self.impulse;
        impulse.modified_joints = self.impulse_modified;
        impulse.all_joints_modified = self.impulse_all_modified;
        multibody.island_chain_events = self.multibody;
        soft_body.island_events = self.soft_body;
    }
}
