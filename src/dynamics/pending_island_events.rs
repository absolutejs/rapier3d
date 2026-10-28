//! Pending connectivity edits are logical state, unlike rebuildable solver caches.
use crate::alloc_prelude::*;
use crate::dynamics::soft_body::SoftBodyIslandEvent;
use crate::dynamics::{
    ImpulseJointHandle, ImpulseJointIslandEvent, ImpulseJointSet, MultibodyIndex,
    MultibodyJointSet, SoftBodySet,
};

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
