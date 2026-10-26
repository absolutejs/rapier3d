# Actual CCD substep diagnostics

World.ccdSubsteps() exposes the existing native CCD pass counter after a completed
profiled step. Its nullable result distinguishes unavailable telemetry from a valid
zero (CCD did not act; the simulation still advanced). A binding-only freshness
flag resets across profiler transitions and before stepping, and becomes valid after
normal or event-enabled stepping completes. Restored worlds have no profiler sample.
No engine algorithm, timestep policy or solver parameter changes.

Qualification: 13 tests, 45,490 assertions; strict TypeScript consumer; GPU-disabled
browser worker; Node initialization/counter smoke. Two fixture worlds match every
pose/rotation with profiling enabled versus disabled, alternating event collection.
Existing official-upstream motion parity tests also pass. A fast sphere/thin-wall
fixture reports one pass with cap one and two passes with cap four, then resets to
zero when inactive. Toggle and repeated-enable semantics are covered.

An initial test incorrectly expected the existing cube/cavity fixture to subdivide
more than once. Its measured maximum is one despite a configured maximum of four.
That failed assumption is retained in initial-fixture-assumption.log. The corrected
activation assertion is supplemented by a separate fixture proving actual subdivision;
no motion tolerance or physical acceptance threshold changed.

The native counter gives the number of passes, not individual dt values, impact
fractions or a guarantee against material overlap. Profiling is opt-in and remains
disabled by default. Published artifact contents and checksum must be verified before
game adoption; the running game remains on 0.2.1 until then.
