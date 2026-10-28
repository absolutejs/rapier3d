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
