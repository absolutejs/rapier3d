# Private stabilization stage ablation

Parent 0484d56 is the rejected early restitution experiment. Preserve its dist under .absolutejs/early-restitution-dist. Change only the worker loop bound to execute zero post-integration stabilization passes; do not alter iteration parameters or any contact formulas. This is a causal experiment, not a public solver option or proposed production behavior. The friction-in-bias decision still sees the original parameter; do not interpret friction cases as a complete no-stabilization policy. Initial evidence uses frictionless fixtures.

Compare touching/separated fixed assemblies and ordinary compounds at restitution 0/.5/1, 60/240 Hz and 1/4 substeps against the saved early build. Check both energy gain and elastic energy loss; the head-on transfer test remains a required release gate. The game stays on published 0.9.0.
