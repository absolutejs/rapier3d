# Composite terrain contact reduction

Base: published 0.16.2 receipt `b113d14`; canonical game adoption `af30e821`.
This explicitly private investigation makes no native production changes.
The convex fix is delivered; do not reopen its release. Reduce generated
terrain support separately, retaining original limits and optimization defaults.

The inherited corrected airborne snapshots represent the real variant-0
terrain fixture at 480/960/1920 Hz. The initial native probe measures convex
vertex clearance at the game cadence under four one-factor controls. It is
not the full game gate and cannot establish WASM parity. First record the
unchanged published-source native baseline, then capture exact first-failure
contact features and test a mechanism before changing the engine.

Use offline Cargo, checkout-local targets, at most two compiler jobs and no
native GPU. Preserve failed hypotheses, exact source and bounded receipts.

## Unchanged native baseline

The 12 native controls complete using published 0.16.2 production source.
Default proxy clearance minima are -17.683/-5.217/-20.964 mm at
480/960/1920 Hz; the last stops at the original -20 mm threshold. More
iterations passes all three rates, but disabling clustering can regress the
960 Hz case to -22.260 mm. These observations do not justify disabling
clustering or changing the game's solver budgets. WASM replay is being
measured independently; native f32 execution is not browser-byte parity.

## Heightfield false-contact reduction

The isolated game heightfield candidate (game branch
`research/heightfield-contact-qualification`, `b3ec80f7`) improves the original
variant-0 terrain fixture but newly rejects variant 3, root 15, at 1920 Hz.
Step 2404 reports 319.683 mm cached penetration, despite negligible sampled
vertex clearance. It is **not adopted**. Exact before/after snapshots and
read-only replay receipts are in `heightfield-regression/`.

`manifolds.rs` reproduces the bad manifold against heightfield triangle 1711
and convex collider index 10 using a fresh query with no cached contacts.
Thus recycling and solver stepping are not necessary to reproduce this error.
Both collider and current-body poses reproduce it. The after-step state yields
an ordinary ~0.059 mm contact instead.

`recenter.rs` controls the coordinate origin without changing triangle topology
or collider shape. A triangle-vertex origin eliminates the before-state false
depth, with exact f32 reconstruction of all triangle vertices **and relative
translation**. Centroid/bounds-center origins also remove the false depth but
can perturb reconstructed translation by 9.537e-7 solver units. The initial
strict all-origin assertion failure is retained in `recenter.log`; the corrected
probe records these differences instead of claiming exact equivalence for them.
All 32 fresh/cached, before/after, collider/body and origin combinations are
retained. Distances are solver centimetres, not metres.

`plane-oracle.py` independently computes a double-precision triangle-plane
separating-translation bound without any collision query. Before the bad step,
the native transformed vertices need only 0.000004937 mm translation to lie
entirely above the plane. A separately normalized f64 quaternion reconstruction
is already separated. Either is incompatible with a 319.683 mm minimum-depth
interpretation. This is a one-plane separation upper bound, not an exact
triangle/convex distance or a continuous-time guarantee. The after-step bound
(~0.059 mm) agrees with the sane manifold scale.

These results support a coordinate-conditioning problem in closest-feature /
clipped manifold construction. They do not yet qualify a production correction.
No engine source, solver budget, rejection threshold or canonical terrain
representation has changed in this research checkout.
