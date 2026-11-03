# Convex face preservation candidate

Private candidate based on published Rapier 0.21.2. It pins Parry e6a8693,
which preserves noncoplanar convex-mesh triangles using exact orientation predicates.
The original constructor merged merely similar normals, flattening a shallow ridge
and changing generated rock mass. Canonical Parry host qualification passes four
focused tests in both scalar widths plus 85 F32 and 84 F64 library tests.

This checkout is explicitly versioned 0.21.3-candidate.0. The game remains on the
published package. New Wasm mass/ray/snapshot checks are prepared, but are not yet
qualified. The old native-kernel manifest must reject the newly built bytes until
those bytes are explicitly marked as this private research candidate. Never publish
or adopt this candidate marker as a stable release.

The exact captured source mesh is preserved under tests/fixtures/convex-stone-mass.json.
The build lock is kept coherent across engine, bindings and double-precision export.
No local installed dependency patch is used. Source changes belong to the real Parry
package and are backed up in its fix/convex-face-preservation branch.
