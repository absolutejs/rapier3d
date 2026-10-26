//! Deterministic accepted-impact components. No world scan or spatial sampling.
use crate::alloc_prelude::*;
use crate::math::Real;
use alloc::collections::BTreeMap;
pub(super) type BodyKey = (u32, u32);

/// Only dynamic participants are supplied by the caller. `None` represents an
/// external/static/kinematic target; it must not connect unrelated dynamic bodies.
pub(super) fn coherent_fractions(hits: &[(BodyKey, Option<BodyKey>, Real)]) -> Vec<(BodyKey, Real)> {
    let mut indices = BTreeMap::new();
    for &(a, b, t) in hits {
        if !(0.0..1.0).contains(&t) { continue; }
        indices.insert(a, 0);
        if let Some(b) = b { indices.insert(b, 0); }
    }
    for (i, index) in indices.values_mut().enumerate() { *index = i; }
    let mut parents: Vec<_> = (0..indices.len()).collect();
    let mut times = vec![1.0; indices.len()];
    fn root(parents: &mut [usize], mut i: usize) -> usize {
        while parents[i] != i {
            parents[i] = parents[parents[i]];
            i = parents[i];
        }
        i
    }
    for &(a, b, t) in hits {
        if !(0.0..1.0).contains(&t) { continue; }
        let ai = indices[&a];
        times[ai] = Real::min(times[ai], t);
        if let Some(b) = b {
            let bi = indices[&b];
            times[bi] = Real::min(times[bi], t);
            let ar = root(&mut parents, ai);
            let br = root(&mut parents, bi);
            // Stable root selection makes results independent of hit traversal order.
            parents[ar.max(br)] = ar.min(br);
        }
    }
    let mut component_times = vec![1.0; indices.len()];
    for (i, time) in times.iter().enumerate() {
        let r = root(&mut parents, i);
        component_times[r] = Real::min(component_times[r], *time);
    }
    indices.into_iter().map(|(key, i)| (key, component_times[root(&mut parents, i)])).collect()
}
