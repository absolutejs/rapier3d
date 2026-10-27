use crate::alloc_prelude::*;
use crate::dynamics::{IntegrationParameters, IslandManager, RigidBodySet, SoftBodySet};
use crate::geometry::{
    BroadPhaseBvh, Collider, ColliderHandle, ColliderSet, CollisionEvent, NarrowPhase,
};
use crate::math::Real;
use crate::parry::bounding_volume::Aabb;
use crate::pipeline::{EventHandler, PhysicsHooks, QueryFilter};
use crate::prelude::{ActiveEvents, CollisionEventFlags};
use parry::query::sweep_toi::Sweep;

use super::sweeps::{
    BodyContinuousResult, CcdTargets, PseudoHitMode, collect_fixed_targets, collect_soft_targets,
    is_bullet, map_bodies_parallel, sweep_fast_body, MovingCcdTargets, motion_end,
};

/// Continuous Collision Detection solver preventing fast objects from tunneling:
/// after the solver, bodies that moved more than half their thinnest extent sweep their colliders
/// and `next_position` is clamped to the earliest impact — velocities untouched, no re-solve; the
/// residual approach resolves next step via speculative contacts.
///
/// Fast dynamic bodies sweep against fixed colliders and soft-body meshes; `ccd_enabled` makes a
/// bullet that also sweeps kinematic/dynamic bodies (never other bullets); mesh-like colliders are
/// never the moving shape; compounds sweep per convex child; `max_ccd_substeps = 0` disables CCD.
#[derive(Clone, Default)]
#[cfg_attr(feature = "serde-serialize", derive(Serialize, Deserialize))]
pub struct CCDSolver {
    #[cfg(feature = "dim3")]
    #[cfg_attr(feature = "serde-serialize", serde(skip))]
    trace_hits: Option<Vec<f64>>,
    #[cfg(feature = "dim3")]
    #[cfg_attr(feature = "serde-serialize", serde(skip))]
    trace_truncated: bool,
    /// Cached fixed-target list for the non-bullet sweep pass: the AABB loosening it was built
    /// with; `None` past [`FIXED_TARGETS_LIST_MAX`] (sweep queries the full BVH). Invalidated by
    /// the scene-change flag — re-scanning every collider each step dominated CCD on large scenes.
    #[cfg_attr(feature = "serde-serialize", serde(skip))]
    fixed_targets_cache: Option<FixedTargetsCache>,
}

/// The AABB loosening the cached fixed-target list was built with, paired with the list
/// itself — `None` past [`FIXED_TARGETS_LIST_MAX`], where the sweep queries the full BVH.
type FixedTargetsCache = (Real, Option<Vec<(ColliderHandle, Aabb)>>);

impl CCDSolver {
    #[cfg(feature = "dim3")]
    pub(crate) fn begin_hit_trace(&mut self) { self.trace_hits = Some(Vec::new()); self.trace_truncated = false; }
    #[cfg(feature = "dim3")]
    pub(crate) fn take_hit_trace(&mut self) -> (Vec<f64>, bool) { (self.trace_hits.take().unwrap_or_default(), self.trace_truncated) }

    /// Initializes a new CCD solver
    pub fn new() -> Self {
        Self::default()
    }

    /// Discards the cached fixed-target list used by the non-bullet continuous pass.
    /// This must be called any time the fixed targets change. If using the physics pipeline,
    /// it is called for you. If not, it must be called manually.
    pub fn invalidate_fixed_targets_cache(&mut self) {
        self.fixed_targets_cache = None;
    }

    /// Updates the set of bodies that needs CCD to be resolved.
    ///
    /// Returns `true` if any rigid-body must have CCD resolved.
    pub fn update_ccd_active_flags(
        &self,
        islands: &IslandManager,
        bodies: &mut RigidBodySet,
        dt: Real,
        include_forces: bool,
    ) -> bool {
        let mut ccd_active = false;

        for handle in islands.active_bodies() {
            let rb = bodies.index_mut_internal(handle);

            // Default tier: every fast dynamic body is a CCD origin. `ccd_enabled`
            // no longer gates *activation*, only the sweep *scope* (fixed-only vs all bodies),
            // applied later during pair selection.
            if rb.is_soft_frame() {
                // A cluster proxy's pose is derived from its particles: it is never swept.
                rb.ccd.ccd_active = false;
            } else if rb.is_dynamic_or_kinematic() {
                let moving_fast = if include_forces {
                    // Pre-solve (substep splitter): `next_position` isn't solved yet, use the
                    // current velocity with forces, like `find_first_impact`. The last solved
                    // motion (`ccd_vels`) is stale, or zero on a body's first step.
                    rb.ccd.is_moving_fast(
                        dt,
                        &rb.vels,
                        if rb.is_dynamic() { Some((&rb.forces, &rb.mprops)) } else { None },
                        rb.mprops.max_extent(),
                    )
                } else {
                    // Post-solve: the fast-body criterion on the actual solved motion.
                    rb.ccd.is_moving_fast_with_next_position(
                        dt,
                        &rb.ccd_vels,
                        &rb.pos,
                        rb.mprops.local_mprops.local_com,
                        rb.mprops.max_extent(),
                    )
                };
                rb.ccd.ccd_active = moving_fast;
                ccd_active = ccd_active || moving_fast;
            }
        }

        ccd_active
    }

    /// Find the first time a CCD-active body has a non-sensor collider hitting another
    /// non-sensor collider, for the multi-substep splitter.
    ///
    /// Returns the impact time in `[0, dt)` if any.
    #[profiling::function]
    #[allow(clippy::too_many_arguments)]
    pub fn find_first_impact(
        &mut self,
        dt: Real, // NOTE: this doesn’t necessarily match the `params.dt`.
        params: &IntegrationParameters,
        islands: &mut IslandManager,
        bodies: &mut RigidBodySet,
        colliders: &ColliderSet,
        broad_phase: &mut BroadPhaseBvh,
        narrow_phase: &NarrowPhase,
        hooks: &dyn PhysicsHooks,
    ) -> Option<Real> {
        // NOTE: broad-phase AABBs are NOT enlarged to the swept volumes: only the fast body's
        // query box is swept (per collider, below); targets keep their regular fat AABBs.
        // Swept AABBs written into the tree would leak into the next step (pair explosion).
        let query_pipeline = broad_phase.as_query_pipeline(
            narrow_phase.query_dispatcher(),
            bodies,
            colliders,
            QueryFilter::default(),
        );
        let (bvh, dispatcher) = (query_pipeline.bvh, query_pipeline.dispatcher);

        let linear_slop = params.allowed_linear_error();
        let fast_bodies: Vec<_> = islands
            .active_bodies()
            .filter(|h| bodies[*h].ccd.ccd_active)
            .collect();

        let moving = MovingCcdTargets::new(islands, bodies, colliders, dt, true);
        let results = map_bodies_parallel(&fast_bodies, hooks, |handle, hooks| {
            let rb1 = &bodies[handle];
            // `next_position` isn't solved yet: sweep to the forces/velocities integration.
            let predicted_body_pos = motion_end(rb1, true, dt);
            sweep_fast_body(
                handle,
                bodies,
                colliders,
                predicted_body_pos,
                CcdTargets::Relative { base: bvh, moving: &moving },
                dispatcher,
                hooks,
                dt,
                linear_slop,
                PseudoHitMode::Ignore,
            )
        });

        let min_fraction = results.iter().map(|result| result.fraction).fold(1.0, Real::min);
        // A continuous hit can precede discrete contact generation by its slop.
        // Wake only the solid earliest-hit participants, after immutable queries
        // finish, so the following solve includes the previously sleeping target.
        let mut wake_handles = Vec::new();
        for result in results {
            if result.fraction <= min_fraction && result.fraction < 1.0 {
                wake_handles.push(result.handle);
                wake_handles.extend(result.impact_bodies);
            }
        }
        // Equal-time contacts must not depend on BVH traversal or collider order.
        wake_handles.sort_unstable_by_key(|handle| handle.into_raw_parts());
        wake_handles.dedup();
        for handle in wake_handles {
            if bodies[handle].is_dynamic() && bodies[handle].is_sleeping() {
                islands.wake_up(bodies, handle, true);
            }
        }
        (min_fraction < 1.0).then_some(min_fraction * dt)
    }

    /// Runs the continuous-collision pass on all fast bodies and clamps their `next_position`
    /// to their earliest time of impact: non-bullets sweep the automatic targets (fixed
    /// colliders and soft-body collision meshes) first, then bullets sweep every (possibly
    /// already clamped) body; velocities are never modified. Sensor
    /// crossings the narrow phase would miss entirely emit paired `Started`/`Stopped`
    /// intersection events.
    #[profiling::function]
    #[allow(clippy::too_many_arguments)]
    pub fn solve_continuous(
        &mut self,
        params: &IntegrationParameters,
        islands: &IslandManager,
        bodies: &mut RigidBodySet,
        colliders: &ColliderSet,
        soft_bodies: &SoftBodySet,
        broad_phase: &mut BroadPhaseBvh,
        narrow_phase: &NarrowPhase,
        hooks: &dyn PhysicsHooks,
        events: &dyn EventHandler,
    ) {
        let dt = params.dt;
        let linear_slop = params.allowed_linear_error();

        // NOTE: broad-phase AABBs are NOT enlarged to the swept volumes: only the fast body's
        // query box is swept; stationary targets keep their fat AABBs. Swept AABBs in
        // the tree leak into the next step's broad phase (pair explosion, ~2x narrow-phase cost).
        // All sweeps read the same solved endpoints before any clamping occurs.
        let fast_bodies: Vec<_> = islands.active_bodies().filter(|h| bodies[*h].ccd.ccd_active).collect();
        let all_results = {
            let moving = MovingCcdTargets::new(islands, bodies, colliders, dt, false);
            let query_pipeline = broad_phase.as_query_pipeline(narrow_phase.query_dispatcher(), bodies, colliders, QueryFilter::default());
            map_bodies_parallel(&fast_bodies, hooks, |handle, hooks| {
                sweep_fast_body(handle, bodies, colliders, bodies[handle].pos.next_position,
                    CcdTargets::Relative { base: query_pipeline.bvh, moving: &moving },
                    query_pipeline.dispatcher, hooks, dt, linear_slop, PseudoHitMode::Record)
            })
        };
        #[cfg(feature = "dim3")]
        if let Some(trace) = &mut self.trace_hits {
            for result in &all_results {
                if result.fraction >= 1.0 { continue; }
                let (i,g) = result.handle.into_raw_parts();
                let targets = result.impact_bodies.len().max(1);
                if trace.len() / 6 + targets > 1024 { self.trace_truncated = true; break; }
                let dynamic = if bodies[result.handle].is_dynamic() { 1.0 } else { 0.0 };
                if result.impact_bodies.is_empty() {
                    trace.extend_from_slice(&[i as f64,g as f64,-1.0,-1.0,result.fraction as f64,dynamic]);
                } else {
                    for target in &result.impact_bodies {
                        let (ti,tg)=target.into_raw_parts();
                        trace.extend_from_slice(&[i as f64,g as f64,ti as f64,tg as f64,result.fraction as f64,dynamic]);
                    }
                }
            }
        }
        let resolved_fractions = Self::apply_clamps(bodies, colliders, narrow_phase, linear_slop, &all_results);

        // Emit intersection events for sensor crossings that happened strictly before each
        // body's final solid impact and that the narrow phase would never observe (no
        // overlap at either the start or the clamped end pose).
        let mut emitted_sensor_pairs = alloc::collections::BTreeSet::new();
        for result in &all_results {
            let resolved_fraction = resolved_fractions.binary_search_by_key(&result.handle.into_raw_parts(), |(key, _)| *key)
                .map(|i| resolved_fractions[i].1).unwrap_or(1.0);
            for hit in &result.pseudo_hits {
                if hit.fraction >= resolved_fraction {
                    // The body stops before reaching this sensor.
                    continue;
                }

                let co1 = &colliders[hit.ch1];
                let co2 = &colliders[hit.ch2];

                if !co1.is_sensor() && !co2.is_sensor() {
                    // TODO: this happens if we found a TOI between two non-sensor
                    //       colliders with mismatching solver_flags. It is not clear
                    //       what we should do in this case: we could report a
                    //       contact started/contact stopped event for example. But in
                    //       that case, what contact pair should be pass to these events?
                    // For now we just ignore this special case. Let's wait for an actual
                    // use-case to come up before we determine what we want to do here.
                    continue;
                }

                let next_pose = |co: &Collider| match co.parent.as_ref() {
                    Some(parent) => bodies[parent.handle].pos.next_position * parent.pos_wrt_parent,
                    None => co.pos.0,
                };

                let prev_pos12 = co1.pos.inv_mul(&co2.pos);
                let next_pos12 = next_pose(co1).inv_mul(&next_pose(co2));

                let dispatcher = narrow_phase.query_dispatcher();
                let intersect_before = dispatcher
                    .intersection_test(&prev_pos12, co1.shape.as_ref(), co2.shape.as_ref())
                    .is_ok_and(|hit| hit.intersecting);
                let intersect_after = dispatcher
                    .intersection_test(&next_pos12, co1.shape.as_ref(), co2.shape.as_ref())
                    .is_ok_and(|hit| hit.intersecting);

                if !intersect_before
                    && !intersect_after
                    && (co1.flags.active_events | co2.flags.active_events)
                        .contains(ActiveEvents::COLLISION_EVENTS)
                {
                    // Symmetric relative sweeps may discover the same crossing twice.
                    // Deduplicate only after endpoint/event eligibility checks so an
                    // ineligible direction cannot suppress the valid one.
                    let first = hit.ch1.into_raw_parts();
                    let second = hit.ch2.into_raw_parts();
                    let pair = if first <= second { (first, second) } else { (second, first) };
                    if !emitted_sensor_pairs.insert(pair) { continue; }
                    // Emit one intersection-started and one intersection-stopped event.
                    events.handle_collision_event(
                        bodies,
                        colliders,
                        CollisionEvent::Started(hit.ch1, hit.ch2, CollisionEventFlags::SENSOR),
                        None,
                    );
                    events.handle_collision_event(
                        bodies,
                        colliders,
                        CollisionEvent::Stopped(hit.ch1, hit.ch2, CollisionEventFlags::SENSOR),
                        None,
                    );
                }
            }
        }
    }

    /// Dynamic participants in one accepted-impact component advance to a common
    /// fraction of their original solved sweeps. Leaving a slower target at its full
    /// endpoint after stopping only its CCD-active partner creates new penetration.
    /// Kinematic trajectories and soft frames are never shortened; velocities stay unchanged.
    fn apply_clamps(bodies: &mut RigidBodySet, colliders: &ColliderSet, narrow_phase: &NarrowPhase, linear_slop: Real, results: &[BodyContinuousResult]) -> Vec<(super::clamp_graph::BodyKey, Real)> {
        let mut hits = Vec::new();
        for result in results {
            let origin = &bodies[result.handle];
            if result.fraction >= 1.0 || !origin.is_dynamic() || origin.is_soft_frame() { continue; }
            let mut linked = false;
            for target in &result.impact_bodies {
                let rb = &bodies[*target];
                if rb.is_dynamic() && !rb.is_soft_frame() {
                    hits.push((result.handle.into_raw_parts(), Some(target.into_raw_parts()), result.fraction));
                    linked = true;
                }
            }
            if !linked { hits.push((result.handle.into_raw_parts(), None, result.fraction)); }
        }
        // Only join a touching neighbor when unequal clamping worsens its normal
        // constraint. Tangential sliding must remain free. Revisit changed components
        // until fractions stop decreasing; each added edge permanently joins components.
        let mut fractions: alloc::collections::BTreeMap<_, _> =
            super::clamp_graph::coherent_fractions(&hits).into_iter().collect();
        let mut pending: alloc::collections::BTreeSet<_> = fractions.keys().copied().collect();
        let mut links = alloc::collections::BTreeSet::new();
        while let Some(key) = pending.pop_first() {
            let handle = crate::dynamics::RigidBodyHandle::from_raw_parts(key.0, key.1);
            for collider in bodies[handle].colliders() {
                for pair in narrow_phase.contact_pairs_with(*collider) {
                    let other_collider = if pair.collider1 == *collider { pair.collider2 } else { pair.collider1 };
                    let Some(other) = colliders[other_collider].parent() else { continue; };
                    let other_body = &bodies[other];
                    if other == handle || !other_body.is_dynamic() || other_body.is_soft_frame() || other_body.is_sleeping() || !other_body.is_enabled() { continue; }
                    let other_key = other.into_raw_parts();
                    let edge = if key < other_key { (key, other_key) } else { (other_key, key) };
                    if links.contains(&edge) { continue; }
                    let violates = pair.solver_manifolds().iter().any(|m| {
                        if m.data.relative_dominance != 0
                            || !m.data.solver_flags.contains(crate::geometry::SolverFlags::COMPUTE_RIGID_IMPULSES) { return false; }
                        let (Some(h1), Some(h2)) = (m.data.rigid_body1, m.data.rigid_body2) else { return false; };
                        let (r1, r2) = (&bodies[h1], &bodies[h2]);
                        let t1 = fractions.get(&h1.into_raw_parts()).copied().unwrap_or(1.0);
                        let t2 = fractions.get(&h2.into_raw_parts()).copied().unwrap_or(1.0);
                        if t1 == t2 { return false; }
                        let pose1 = Sweep::from_poses(&r1.pos.position, &r1.pos.next_position, r1.mprops.local_mprops.local_com).transform_at(t1);
                        let pose2 = Sweep::from_poses(&r2.pos.position, &r2.pos.next_position, r2.mprops.local_mprops.local_com).transform_at(t2);
                        m.data.solver_contacts.iter().any(|contact| {
                            let (p1, p2) = m.data.solver_contact_world_points(contact, bodies);
                            let current = (p2 - p1).dot(m.data.normal);
                            if current > linear_slop { return false; }
                            let local1 = r1.mprops.local_mprops.local_com + contact.anchor1;
                            let local2 = r2.mprops.local_mprops.local_com + contact.anchor2;
                            let solved = (r2.pos.next_position * local2 - r1.pos.next_position * local1).dot(m.data.normal);
                            let clamped = (pose2 * local2 - pose1 * local1).dot(m.data.normal);
                            clamped < -linear_slop && clamped < solved - linear_slop
                        })
                    });
                    if violates {
                        links.insert(edge);
                        hits.push((key, Some(other_key), 1.0));
                        let updated = super::clamp_graph::coherent_fractions(&hits);
                        for (changed, fraction) in updated {
                            if fraction < fractions.get(&changed).copied().unwrap_or(1.0) {
                                fractions.insert(changed, fraction);
                                pending.insert(changed);
                            }
                        }
                    }
                }
            }
        }
        let fractions: Vec<_> = fractions.into_iter().collect();
        for ((index, generation), fraction) in &fractions {
            let handle = crate::dynamics::RigidBodyHandle::from_raw_parts(*index, *generation);
            let rb = bodies.index_mut_internal(handle);
            let sweep = Sweep::from_poses(&rb.pos.position, &rb.pos.next_position, rb.mprops.local_mprops.local_com);
            rb.pos.next_position = sweep.transform_at(*fraction);
        }
        fractions
    }
}
