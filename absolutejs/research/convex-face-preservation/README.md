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

Candidate Wasm SHA-256: 47b1f4a5acaa2776fd787e0117dfeaf90e7df9093ab64910a69fae8ed6319809
(3,416,097 bytes). The stable native guard rejected it before the manifest was
explicitly marked researchOnly and the package marked private. 311 package tests
pass (92,817 assertions), and the GPU-disabled browser worker passes, including
captured convex mass, exact snapshot restoration and the existing ten frozen
CCD trajectory/hook/event cases. The package's solverChanges flag is true because
correcting geometry/mass can change motion; solver equations/settings are untouched.

The initial combined tiny-scale mass/ray test failed at scale 0.001. Matched
published/candidate controls show exactly identical ray times at all four scales;
the tiny-scale analytic-height discrepancy predates this patch. Tests now distinguish
all-scale corrected mass and unchanged published ray results from analytic ray
accuracy at scales >= 1. The original failing log and both controls are retained.
This release does not claim to repair tiny-scale ray accuracy.

The game's twelve new form candidates improve from eleven mass failures to zero.
A separate full motion gate still rejects at least one rounded candidate that is
rolling at ten seconds (about 0.092 m/s); those forms remain unadopted. This is not
hidden by the package mass fix. Existing-game suite qualification and independent
build reproduction are still pending at this checkpoint.

The initial cold native build took 3m38s. Downloading the binding generator then
failed under restricted DNS; the existing checksum-pinned archive was reused and
verified by the package installer. No build tools or source were fetched into tmp.
