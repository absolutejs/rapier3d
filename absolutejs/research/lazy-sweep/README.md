# Lazy CCD preparation candidate

Research branch, not a published or qualified release. Baseline is Rapier 0.21.0.
Defers `FastColliderInfo` construction until the first candidate survives existing
broad-phase, same-body, collision-group, tier and hook filtering. Per-collider
preparation is still cached once. Pair ordering and cast bounds remain unchanged.

Motivation: the game's original-pair profile spends ~5 seconds in CCD, and each
convex-piece preparation invokes `shape.mass_properties(1.0)` even when no external
candidate survives. The experiment must show exact trajectories and native
regression equivalence before adoption. No CCD settings or tolerances are changed.

Build uses one Cargo job, low scheduling priority, the existing locked offline
cache, and a separate target directory. Do not change published game dependencies
or the stable native qualification hash to bypass release validation.

The refined candidate retains eager preparation for non-proxy shapes (including
compounds), preserving unsupported-shape rejection before hook callbacks. Convex
point-cloud shapes alone defer mass-property calculation. The first exploratory
build predates this refinement and is not used for qualification. The stable API
build is expected to reject each changed WASM hash; `build-candidate.ts` instead
writes an explicitly research-scoped bundle in this directory's ignored `dist/`.
The canonical qualification manifest and normal package output remain untouched.

In pinned Parry `6afbe26a`, `Shape for ConvexPolyhedron::mass_properties` calls
`to_trimesh()` and then `MassProperties::from_convex_polyhedron`, allocating geometry
and recalculating inertia. The optimization avoids this work only when all target
candidates are rejected; it does not cache stale properties across world steps.

Lazy-only controls (three repeats): full recorded motion and hook-call counts match
0.21.0 in empty space, stopping-wall and filtered-wall cases. The initial game preload did not redirect imports, so its trajectory hashes
belong to a published-baseline repeat and cannot qualify candidate behavior. Preserve
`lazy-only.patch` and its provenance as the exact earlier candidate.

The second candidate uses Parry's public signed-volume/centroid first pass for
convex polyhedra and preserves its zero-volume result. All other shapes keep their
existing centroid calculation. It avoids the unused inertia calculation but still
retains the exact triangle construction and centroid arithmetic.

Final qualification: the explicit-import runner passes all 293 runtime tests
(92,740 assertions); stable 0.21.1 adds both identity tests for 295 passes.
The matched game runs use the same bundling harness, alternating baseline and
candidate order, and reject a mismatched WASM hash before starting. Earlier failed
preload-based tests and missing-fixture-copy attempts are retained as harness
failures, not physical regressions or performance evidence.
