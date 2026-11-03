# 0.21.1 CCD preparation release qualification

Convex sweep preparation now waits until a target passes the existing filters.
Geometric centroids use Parry's identical volume/centroid first pass, avoiding the
unused inertia calculation. Unsupported and compound-shape rejection before user
hooks is preserved. CCD tolerances, solver settings and shape geometry are unchanged.

Qualification in progress; publication is not yet authorized by npm's interactive
confirmation. Do not interpret this file as a publication receipt.

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
