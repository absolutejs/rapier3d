# Private stabilization stage ablation

Parent 0484d56 is the rejected early restitution experiment. Preserve its dist under .absolutejs/early-restitution-dist. Change only the worker loop bound to execute zero post-integration stabilization passes; do not alter iteration parameters or any contact formulas. This is a causal experiment, not a public solver option or proposed production behavior. The friction-in-bias decision still sees the original parameter; do not interpret friction cases as a complete no-stabilization policy. Initial evidence uses frictionless fixtures.

Compare touching/separated fixed assemblies and ordinary compounds at restitution 0/.5/1, 60/240 Hz and 1/4 substeps against the saved early build. Check both energy gain and elastic energy loss; the head-on transfer test remains a required release gate. The game stays on published 0.9.0.

## Result: retain as diagnostic only

WASM d35fdf61cc75ed5a88ebfb76e404b66dcf7c1856ceebe31a3be762e8f0fd5ff4, 3,297,123 bytes. Native compilation 5m02s; private API packaging succeeds after expected old-hash rejection. All 96 comparison runs complete and reproduce prior early baselines. One-substep prepared-geometry algebra predicts the stabilization impulse within 6.731e-7 kg m/s and resulting energy within 3.014e-6 J. Touching elastic energy gain falls to float-scale residuals, but separated multi-substep gain remains up to .165019 J. Existing elastic velocity-transfer test still fails (2 writeback tests pass, 1 fails). This is not a release candidate. Full evidence and state audit: hello-world/docs/stabilization-ablation-2026-10-28.
