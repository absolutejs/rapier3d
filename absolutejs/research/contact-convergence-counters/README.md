# Opt-in adaptive contact convergence observations

Private diagnostics candidate based on published 0.10.0 source c8f0fb7. Keep physical equations, tolerances, loop budgets and all state updates unchanged. Report phase counts, iterations, final residual maxima and phases that exhausted their budget above tolerance. Aggregate across CCD passes using existing solver counters, reset with the existing per-step profiler lifecycle, and expose an owned object only after a completed profiled step. Counts are solve phases/groups, not physical islands or contacts.

Raw counter access is confined to the same single-worker guards that qualify adaptive solves. Profiling disabled leaves these counters untouched; no per-iteration allocation is added. Neither profiling counters nor their freshness state are part of the persistent world snapshot. No package publication or installed dependency change is implied by this private source.

Qualification must include profiler on/off physical snapshot parity, repeated query nonmutation and owned return values, unavailable/fresh/reset/restored lifecycle, no eligible solves, coupled solved cases, actual budget exhaustion, configured iteration minimum, multiple substeps, and browser worker. Compare the new kernel's existing collision/free-motion matrices exactly with published 0.10.0, then build independently before any release.
