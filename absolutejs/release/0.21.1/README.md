# 0.21.1 CCD preparation release qualification

Convex sweep preparation now waits until a target passes the existing filters.
Geometric centroids use Parry's identical volume/centroid first pass, avoiding the
unused inertia calculation. Unsupported and compound-shape rejection before user
hooks is preserved. CCD tolerances, solver settings and shape geometry are unchanged.

Published to npm. Registry metadata and the downloaded archive match the audited
bytes exactly; see `registry-receipt-3.json`. The first two checks returned 404
while npm processed the accepted publication; no duplicate publish was attempted.

- 295 package tests pass, including stable build identity.
- Research controls preserve every recorded pose/velocity and hook count over
  three runs each of empty-space, stopping-wall and filtered-wall scenarios.
- Twelve game tests pass, including coupled contacts, original material binding,
  cancellation and atomic-save rollback (315 assertions).
- Six alternating generated-terrain runs compare the published and candidate
  engines with explicit WASM hash guards. Every full trajectory hash and final
  pose matches. Native stepping improves 1.4–5.6%; CCD improves 4.2–11.7%.
- Absolute timings vary substantially across this machine; these results are not
  a hardware FPS guarantee or a solution to the remaining action-preparation wait.

Game evidence: `docs/stone-pair-lazy-sweep-2026-11-03/` in hello-world.
Research recipe, control data and native provenance: `absolutejs/research/lazy-sweep/`.

- GPU-disabled browser-worker check passes.
- Two independent native builds match all 53 shipped files byte-for-byte.
- Exact archive audit and extracted-archive CCD/snapshot consumer pass.

Archive SHA256: `4ab9bc9a28477eb6b0aac5d7a8d77cdb1ca697d22dab5c81cd7a6b57064c35f8`.
Native SHA256: `1d35b69d746eee6383401a68ec37d051391e0fa321096675b46c86072616e9d5`.
