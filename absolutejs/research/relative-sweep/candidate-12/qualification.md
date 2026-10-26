# Candidate 12: bounded, observational step tracing

Adds opt-in native phase observations without changing solver algorithms or defaults.
Step tracing is disabled by default, not serialized in snapshots, cleared per step,
and limited to 32 bodies, 1024 body rows and 1024 accepted-hit rows. Truncation is
explicit; queries return owned arrays. No native GPU rendering is involved.

Rows distinguish before planning, before solve, after solve, after CCD clamping and
after advancement. Accepted-hit rows distinguish source/target body handles,
fractions and dynamic origins; -1/-1 denotes no recorded target parent body. These
are observations, not exact material contact time or solver impulses.

Three focused tests pass 1187 assertions, including exact native snapshot parity,
owned data, freshness/reset, disabled snapshot restoration, body limit and a static
CCD hit. Strict public type checks pass. Full research suite retains the two known
upstream-motion parity failures; those are not suppressed.

Game fixture checks compare candidate11, trace-disabled candidate12 and trace-enabled
candidate12 against each saved 128-frame sequence. The step921 trace isolates the
material jump specifically to CCD clamping: solved endpoint overlap0.07275%, then
clamped endpoint7.34346%. The cavity (body3) accepts a25% hit against chip(body2),
but only body3 is shortened. Body2 is below the fast-body activation threshold and
keeps its solved endpoint. Velocities are unchanged by this clamping stage.

The instrumented engine remains private because it retains the unqualified research
solver and EPA experiment. Tracing does not make that solver physically acceptable.
Game records live under docs/material-provenance-2026-10-26/internal-step-*.json.
