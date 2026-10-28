# Private restitution iteration trace — 2026-10-28

Read-only research instrumentation on published 0.12.0 source, whose native engine
is qualified 0.11.0. No solver budget/tolerance/impulse update change. Private
package, not eligible for publication or game adoption.

A completed profiled step can export at most 256 rows across all restitution
phases; dropped rows are counted. Rows contain phase, sweep, terminal residual,
maximum change of all native solver velocities, maximum precise impulse change,
maximum stored float impulse change, maximum absolute velocity, sum of precise
normal impulses. State comparisons include ordinary solver-body linear/angular
velocities and generic solver velocities. The trace reads only the existing
single-worker adaptive path. Profiling has substantial tracing overhead; this is
not a benchmark. The fixed-size counter trace is runtime-only, not snapshot data.

Question: does the exhausted fixture truly stop changing all velocities, and if
so do stored/precise impulses keep changing? A repeated residual alone does not
justify early stopping: cached impulses affect subsequent steps. No proposed
optimization is qualified yet. Exact profiled/unprofiled physical controls and
native build identity are required before interpreting trace results.

## Research basis and controls

Erin Catto's Solver2D notes (2024-02-05, reviewed 2026-10-28) describe carrying
accumulated impulses into later steps and clamping accumulated rather than just
incremental impulses. This motivates checking impulse state as well as velocities;
it does not establish an early-stopping criterion for this Rapier implementation.
Source: https://box2d.org/posts/2024/02/solver2d/

The probe generates common snapshots with published 0.12.0 for four side masses,
two friction settings and both insertion orders. Thirty steps per case compare
published, private unprofiled and private profiled snapshot bytes (480 paired
steps). Trace query ownership and nonmutation are checked. This establishes only
instrumentation parity, not physical correctness for every generated mass case.
The trace has substantial diagnostic overhead, including scratch state copies.
No timing result from this kernel should be treated as normal physics cost.
