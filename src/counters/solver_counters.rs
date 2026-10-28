use crate::counters::Timer;
use crate::math::Real;
use core::fmt::{Display, Formatter, Result};

/// Observations of the restricted adaptive contact paths, summed over CCD passes.
/// Runtime-only profiling data; never serialized with the physical world.
#[derive(Default, Clone, Copy, Debug)]
pub struct ContactConvergenceCounters {
    pub compression_solves: usize,
    pub compression_iterations: usize,
    pub compression_limit_hits: usize,
    pub max_compression_residual: Real,
    pub restitution_solves: usize,
    pub restitution_iterations: usize,
    pub restitution_limit_hits: usize,
    pub max_restitution_residual: Real,
}

/// Performance counters related to constraints resolution.
#[derive(Default, Clone, Copy, Debug)]
pub struct SolverCounters {
    /// Free rotation: accepted / nonphysical / cap / invalid or failed solves.
    /// Runtime-only observations, summed across CCD passes when counters enabled.
    pub midpoint_counts: [usize; 4],
    /// Maximum Newton updates among accepted free-rotation solves.
    pub midpoint_max_iterations: usize,
    /// Maximum accepted angular-velocity residual, in radians/second.
    pub midpoint_max_residual: f64,
    /// Opt-in observations; zero counts mean no eligible adaptive solve.
    pub contact_convergence: ContactConvergenceCounters,
    /// Number of contact manifolds and impulse joints handed to the constraints solver (summed
    /// over the CCD substeps). Sleeping bodies' contacts and joints aren't counted.
    pub nconstraints: usize,
    /// Number of contact points handed to the constraints solver, soft-body contacts included
    /// (summed over the CCD substeps).
    pub ncontacts: usize,
    /// Time spent for the resolution of the constraints (force computation).
    pub velocity_resolution_time: Timer,
    /// Time spent for the assembly of all the velocity constraints.
    pub velocity_assembly_time: Timer,
    /// Time spent by the velocity assembly for initializing solver bodies.
    pub velocity_assembly_time_solver_bodies: Timer,
    /// Time spent by the velocity assemble for initializing the constraints.
    pub velocity_assembly_time_constraints_init: Timer,
    /// Time spent for the update of the velocity of the bodies.
    pub velocity_update_time: Timer,
    /// Time spent to write force back to user-accessible data.
    pub velocity_writeback_time: Timer,
}

impl SolverCounters {
    /// Creates a new counter initialized to zero.
    pub fn new() -> Self {
        SolverCounters {
            midpoint_counts: [0; 4],
            midpoint_max_iterations: 0,
            midpoint_max_residual: 0.0,
            contact_convergence: ContactConvergenceCounters::default(),
            nconstraints: 0,
            ncontacts: 0,
            velocity_assembly_time: Timer::new(),
            velocity_assembly_time_solver_bodies: Timer::new(),
            velocity_assembly_time_constraints_init: Timer::new(),
            velocity_resolution_time: Timer::new(),
            velocity_update_time: Timer::new(),
            velocity_writeback_time: Timer::new(),
        }
    }

    /// Reset all the counters to zero.
    pub fn reset(&mut self) {
        self.midpoint_counts = [0; 4];
        self.midpoint_max_iterations = 0;
        self.midpoint_max_residual = 0.0;
        self.contact_convergence = ContactConvergenceCounters::default();
        self.nconstraints = 0;
        self.ncontacts = 0;
        self.velocity_resolution_time.reset();
        self.velocity_assembly_time.reset();
        self.velocity_assembly_time_solver_bodies.reset();
        self.velocity_assembly_time_constraints_init.reset();
        self.velocity_update_time.reset();
        self.velocity_writeback_time.reset();
    }
}

impl Display for SolverCounters {
    fn fmt(&self, f: &mut Formatter) -> Result {
        writeln!(f, "Number of contacts: {}", self.ncontacts)?;
        writeln!(f, "Number of constraints: {}", self.nconstraints)?;
        writeln!(f, "Velocity assembly time: {}", self.velocity_assembly_time)?;
        writeln!(
            f,
            "Velocity resolution time: {}",
            self.velocity_resolution_time
        )?;
        writeln!(f, "Velocity update time: {}", self.velocity_update_time)?;
        writeln!(
            f,
            "Velocity writeback time: {}",
            self.velocity_writeback_time
        )
    }
}
