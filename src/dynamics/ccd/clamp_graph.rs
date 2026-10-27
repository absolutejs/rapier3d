//! Deterministic incremental clamp components. No world scan or spatial sampling.
use crate::alloc_prelude::*;
use crate::math::Real;
use alloc::collections::BTreeMap;
pub(super) type BodyKey = (u32, u32);

/// Union by size with explicit members lets callers revisit only bodies whose
/// fractions decreased. A contact link at time 1 is inert until connected to a seed.
pub(super) struct ClampGraph {
    indices: BTreeMap<BodyKey, usize>,
    keys: Vec<BodyKey>,
    parents: Vec<usize>,
    members: Vec<Vec<usize>>,
    times: Vec<Real>,
}
impl ClampGraph {
    pub(super) fn new() -> Self {
        Self { indices: BTreeMap::new(), keys: Vec::new(), parents: Vec::new(), members: Vec::new(), times: Vec::new() }
    }
    fn index(&mut self, key: BodyKey) -> usize {
        if let Some(&i) = self.indices.get(&key) { return i; }
        let i = self.keys.len();
        self.indices.insert(key, i); self.keys.push(key); self.parents.push(i);
        self.members.push(vec![i]); self.times.push(1.0); i
    }
    fn root(&mut self, mut i: usize) -> usize {
        while self.parents[i] != i {
            self.parents[i] = self.parents[self.parents[i]];
            i = self.parents[i];
        }
        i
    }
    /// Only dynamic participants are supplied. None is an external target and
    /// never joins unrelated bodies. Returns only newly decreased body fractions.
    pub(super) fn add_hit(&mut self, a: BodyKey, b: Option<BodyKey>, t: Real) -> Vec<(BodyKey, Real)> {
        if !(0.0..=1.0).contains(&t) || (t == 1.0 && b.is_none()) { return Vec::new(); }
        let ai = self.index(a); let mut ar = self.root(ai);
        let br = b.map(|key| { let i = self.index(key); self.root(i) }).unwrap_or(ar);
        let time = Real::min(t, Real::min(self.times[ar], self.times[br]));
        let mut changed = Vec::new();
        for root in [ar, br].into_iter().take(if ar == br { 1 } else { 2 }) {
            if time < self.times[root] {
                changed.extend(self.members[root].iter().map(|&i| (self.keys[i], time)));
            }
        }
        if ar != br {
            let mut child = br;
            if self.members[ar].len() < self.members[br].len()
                || (self.members[ar].len() == self.members[br].len() && self.keys[ar] > self.keys[br]) {
                core::mem::swap(&mut ar, &mut child);
            }
            self.parents[child] = ar;
            let merged = core::mem::take(&mut self.members[child]);
            self.members[ar].extend(merged);
        }
        self.times[ar] = time;
        changed
    }
    pub(super) fn fractions(&mut self) -> Vec<(BodyKey, Real)> {
        let keys: Vec<_> = self.indices.iter().map(|(&key, &i)| (key, i)).collect();
        keys.into_iter().filter_map(|(key, i)| {
            let root = self.root(i); let time = self.times[root];
            (time < 1.0).then_some((key, time))
        }).collect()
    }
}

pub(super) fn coherent_fractions(hits: &[(BodyKey, Option<BodyKey>, Real)]) -> Vec<(BodyKey, Real)> {
    let mut graph = ClampGraph::new();
    for &(a, b, t) in hits { graph.add_hit(a, b, t); }
    graph.fractions()
}
