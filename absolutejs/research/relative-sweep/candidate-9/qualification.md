# Candidate 9: keep unchanged targets in the existing broadphase

MovingCcdTargets omits a transient leaf only when the predicted/solved end pose is
exactly equal to the current pose. The collider remains in the base broadphase query;
no collision target is removed. Slow translation and rotation still enter the swept
index. This avoids rebuilding a moving-target BVH for stationary awake bodies.

The combined kinematic gate passes unchanged: 12 crossing cases, 6 prescribed paths,
5 filter controls, 36 scale/order/frame cases, 135 dynamic controls, and 12 simultaneous
impact cases. Twenty shape observations and three tiny-remainder endpoint cases also
retain candidate 8's outcomes. The game-side optional state audit records body poses,
velocities, sleep states and live/cached solver contacts; all 512 hashes across four
saved-checkpoint policies match candidate 8 exactly. The bounded comparison tool also
rejects a deliberately changed hash.

CPU/WASM no-impact sample: 1,000 awake stationary targets + one fast kinematic source
falls from candidate 8 median 4.2576ms / sampled p95 7.4128ms to median 1.4254ms / p95
1.6357ms. Both samples ran without native compilation. These are limited CPU samples,
not browser/GPU FPS or a general performance guarantee. Control runs and every sample
are retained. Work still scans active bodies; this does not establish world-size-
independent cost or cover dense moving/rotating crowds.

Unmodified package tests: 11 pass, 2 existing upstream numerical-parity failures,
47,258 assertions. GPU-disabled bounded browser worker passes: solver contacts, live
anchors, CCD timing/counters, clustering/minimum controls and restored collider owners.
No native GPU rendering, game dependency substitution, or npm publication occurred.

Still UNQUALIFIED: existing material overlap, cap-one response, general rotating/
compound contact and simultaneous variation, and broader cost bounds remain. The game
continues using registry 0.3.0. This is a durable research improvement, not a release.
