//! Opt-in bounded observations. Never writes bodies or solver state.
use super::PhysicsPipeline;
use crate::{alloc_prelude::*, dynamics::RigidBodySet, math::Real};

#[derive(Default)]
pub(super) struct StepTrace {
    pub enabled: bool,
    pub completed: bool,
    pub truncated: bool,
    pub data: Vec<f64>,
    pub impacts: Vec<f64>,
}
impl StepTrace {
    pub fn begin_step(&mut self) {
        self.completed = false;
        self.truncated = false;
        self.data.clear();
        self.impacts.clear();
    }
}
impl PhysicsPipeline {
    /// Opt in to bounded phase observations. Changing this clears old observations.
    pub fn set_step_trace_enabled(&mut self, enabled: bool) {
        self.step_trace = StepTrace { enabled, ..StepTrace::default() };
    }
    /// Whether phase observations are enabled.
    pub fn is_step_trace_enabled(&self) -> bool { self.step_trace.enabled }
    /// Owned rows from the last completed step; see the TypeScript schema documentation.
    pub fn step_trace_data(&self) -> Option<Vec<f64>> {
        (self.step_trace.enabled && self.step_trace.completed).then(|| self.step_trace.data.clone())
    }
    /// Owned impact rows; pass, source index/generation, target index/generation,
    /// fraction, dynamic flag. Target -1/-1 means no parent body was recorded.
    pub fn step_trace_impacts(&self) -> Option<Vec<f64>> {
        (self.step_trace.enabled && self.step_trace.completed).then(|| self.step_trace.impacts.clone())
    }
    /// True if body or row bounds prevented a complete trace.
    pub fn step_trace_truncated(&self) -> bool { self.step_trace.truncated }
    pub(super) fn trace_body_phase(&mut self, phase: u32, pass: usize, dt: Real, remaining: Real, bodies: &RigidBodySet) {
        let trace = &mut self.step_trace;
        if !trace.enabled || trace.truncated { return; }
        const WIDTH: usize = 27;
        const MAX_ROWS: usize = 1024;
        if bodies.len() > 32 || trace.data.len() / WIDTH + bodies.len() > MAX_ROWS {
            trace.truncated = true;
            return;
        }
        for (handle, body) in bodies.iter() {
            let (index, generation) = handle.into_raw_parts();
            let p = body.pos.position.translation;
            let q = body.pos.position.rotation;
            let n = body.pos.next_position.translation;
            let r = body.pos.next_position.rotation;
            let v = body.vels.linvel;
            let w = body.vels.angvel;
            let row: [f64; WIDTH] = [
                phase as f64, pass as f64, dt as f64, remaining as f64,
                index as f64, generation as f64,
                p.x as f64, p.y as f64, p.z as f64,
                q.x as f64, q.y as f64, q.z as f64, q.w as f64,
                n.x as f64, n.y as f64, n.z as f64,
                r.x as f64, r.y as f64, r.z as f64, r.w as f64,
                v.x as f64, v.y as f64, v.z as f64,
                w.x as f64, w.y as f64, w.z as f64,
                if body.is_ccd_active() { 1.0 } else { 0.0 },
            ];
            trace.data.extend_from_slice(&row);
        }
    }
}
