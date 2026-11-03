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

Follow-up at unchanged settings records all twelve new candidate forms sleeping
by twenty seconds and still sleeping at thirty; the initially flagged form also
rolls at ten seconds with the published engine. All remain within the floor area.
The original ten-second gate is not retroactively reported as passed. Game evidence
is retained under docs/stone-form-native-fix-2026-11-03 in the game checkout.

The private archive now uses the existing audit convention 0.21.3-research.0 and
unqualified-convex-face-preservation-1. This changes metadata only; native bytes
remain identical. All 53 packed distribution files and embedded native payload
pass the existing --research archive audit. Eight focused identity/geometry tests
pass after relabeling. The exact private archive is backed up for isolated consumers.

## Release hold: standalone cut fragment

The installed candidate passes 1125/1127 game tests, with a real settling failure
in physical-material variant 7. The native-only reproduce-cut-fragment.ts now
reproduces it with one convex collider (48 input points) against a cuboid floor,
without any game imports. Published 0.21.2 sleeps at step 17982 (9.365625 s at
1920 Hz); the candidate remains awake after 38400 steps (20 s). It uses the same
explicit material mass and inertia, contact parameters and input vertices.
The larger material component sleeps independently in both engines.

Diagnostic-only controls also fail to settle the candidate within 20 seconds:
480, 960, 3840 and 7680 Hz; 32 solver iterations at 1920 Hz; and zero restitution
at 1920 Hz. These controls are not proposed game settings. Increasing compute
alone does not resolve the captured case.

The genuine game trace is identical through step 1626; first motion divergence
is step 1627 (0.847395833 s), at the first floor contact. Returned f64 collider
meshes are identical, but f32 native support-face/contact-point selection changes.
A candidate support-feature test confirms the captured initial selected polygon
contains the extreme vertex. A separate source experiment investigates nearly
coincident clipped and GJK witness points; it is not part of this archive.

Research consulted 2026-11-03:
- https://box2d.org/files/ErinCatto_ContactManifolds_GDC2007.pdf — contact coherence,
  contact IDs, retaining a small manifold and rejecting nearby new points.
- https://nvidia-omniverse.github.io/PhysX/physx/5.5.1/docs/Geometry.html — convex
  cooking has an explicit plane tolerance. This is contextual evidence, not
  justification to flatten measured game geometry or relax mass acceptance.

Do not publish this candidate or change game rejection gates to pass it.

## Interior-face candidate (research.2): not qualified

Native source af84bb6, SHA256 a9483da1bd491f79d488b417306242e58fa2921ecf9edd92255c5f9f463994ac,
3422207 bytes. The audited archive preserves all 53 shipped files. The source
excludes rejected witness coalescing. All three physical-material game fixtures
now qualify at 960 Hz; however, the full game suite has 1122 passes and five real
contact/settling failures. Do not publish or adopt this candidate.

Package tests: 307 pass, four historical CCD motion hashes differ for convex-wall
scenarios. Ten-mode repeated comparisons are deterministic, with six scenarios
still bit-identical to 0.21.2. The four changed scenarios pass their existing
wall-crossing controls; a separate authored-vertex endpoint audit records up to
0.000168 normalized-unit wall-plane overlap. This is discrete endpoint evidence,
not proof of continuous clearance. Historical references remain unchanged.

The isolated fragment still fails at 1920 Hz; it settles at 960 Hz in 17.379167 s.
Equivalent top planes with different box depths produce different settling
outcomes, so a simple monotonic precision/timestep explanation is not established.
A new native support reduction identifies a concrete issue: selecting a face by
normal alignment can omit the actual supporting vertex, producing zero analytic
contacts for a penetrating anisotropic hull. The follow-up source preserves that
vertex explicitly and must pass the five game regressions before release work.
