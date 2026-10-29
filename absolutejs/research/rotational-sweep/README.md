# Private rotational interval engine qualification

Base is published Rapier 0.16.3 receipt 16a3aa8 (game adoption 1826c324).
This isolated checkout prepares qualification of the Parry rotational interval
candidate. Pinning awaits its native feature/no-std checks. The zero native
identity is intentionally unqualified and must fail API packaging until a new
native payload is built and recorded for private tests. No release/adoption.

Intended scope: 3D orientation-changing direct sweeps use fixed separating-plane
motion bounds; unchanged orientations retain the original algorithm. No GJK
normal, persistent triangle frame or composite-CCD-bound experiment is included.
The collision query remains bounded at 25 distance queries and explicit Failed.
No game tolerances, solver budgets or material defaults change.

Before release consideration: native feature/no-std and direct-sweep fixtures,
package/browser tests, native game controls, paired 24 terrain cases, generated/
excavated requests, exact saved contact replay, full game suite, worker build,
CPU/WASM costs and independent native builds. Changes in physical outcomes must
be recorded, including any rejection. Composite traversal is a separate known
limitation and a corrected direct sweep does not establish full CCD correctness.

Parry is now pinned to native-qualified 627113c5cf9fc630d5ea2a727d77d89c1bc8114b.
Native selected suites pass 85/84/98/98 tests, plus both 3D no-std checks. The
432-case actual native matrix matches the private prototype exactly. Engine
qualification below remains pending. The earlier zero identity is intentional.

Private WASM compilation passes in 5m38s with one Cargo job. All 236 package
tests pass (86,879 assertions), and the GPU-disabled browser regression/replay
passes. Packaged native SHA-256 is
174bf8d5a0bacd46f9a3cd2304e5b044e95ade47459f621eebab5ed7c692de55,
3,362,954 bytes (5,763 bytes above published 0.16.3). Audited private archive
SHA-256 a8eebecfa706f367324c47f9c797b6e1124d65bd200cbc5f0937447afb1940e2.
All 53 files match the isolated game install. Real-game comparisons are underway;
no publication or canonical adoption is authorized by these initial checks alone.

## Blocked by new whole-game regression

The full game suite is 843 pass / 1 fail. Broad oak on excavated terrain reports
201.937 mm cached contact penetration at step 4704. Exact snapshots, read-only
inspection and byte-exact one-step replay are backed up at game 42eb8004.
The 24 raw tree cases add no rejection and fix variant 0/1920, while variant
5/960 remains rejected identically in both baseline and candidate. Four actual
terrain requests and 18 flat-tree cases pass. The new full-suite failure blocks
release; source reduction is underway. No canonical adoption or npm publication.

## Exact broad-oak contact reduction

`extract-oak.rs` restores the captured before/after snapshots from game research
commit `783431f3`. It isolates triangle 6111 and collider 10.
`oak-native-queries.json` preserves exact convex topology, local geometry,
relative poses, cached points/normals and fresh/seeded query results.

At the **before-step pose**, a query seeded with the cached manifold reproduces
-20.19365119934082 cm exactly. An empty manifold at the same pose returns no
points; moving the query origin to a triangle vertex gives about -0.000506 cm
for both seeded and empty queries. At the after-step pose all four controls
return about -0.030687 cm. Thus this is a direction/conditioning-sensitive
contact calculation, not evidence of a 202 mm geometric intersection.

`oak-plane-oracle.py` uses independent double-precision plane projections.
The before-pose separating-translation upper bound is 0.01265 mm using native
f32 transformed vertices (0.01247 mm using normalized f64 reconstruction).
The after-pose bound is approximately 0.30686 mm. This is an upper bound for
separating this convex solid from this triangle, not a whole-terrain or swept
collision guarantee. Translation reconstruction error is recorded, not assumed
zero. The pure rotational candidate remains blocked by the full game test.

A separate Parry checkout, `~/alex/parry-rotational-contact-research`, now tests
whether preserving the GJK support-bound direction fixes this seeded fixture
when combined with interval rotation. No combined engine is released.
