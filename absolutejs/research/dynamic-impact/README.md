# Private two-body restitution convergence experiment

Based on published Rapier 0.8.0. The game probe captures a 3.99134 J increase from 14 J at the first off-center box collision; the matching upstream 0.21.0 run has the same first-impact energy. CCD toggles do not affect this fixture, frictionless controls retain the gain, and more temporal subdivisions do not remove it consistently.

The canonical solver performs one end-of-step restitution sweep. This private experiment repeats that sweep 16 times within each Coulomb/twist contact chunk. It tests whether within-chunk convergence contributes to the excess energy. It is not a complete multi-contact restitution algorithm: no global coupling, generic multibody convergence, friction restitution consistency, or energy guarantee is established. It must not be published or adopted in the game.

Source, build and runtime evidence live here; no installed dependency cache is patched. Compile with two jobs in this checkout's own target directory. The existing native checksum guard is expected to reject the new artifact until a separately labeled research identity is recorded.

## Local sweep result

The private WASM `262872baa26f283464bfb24fa7b0651ab8137839225e15d3c101708c74faa37a` removes positive box energy gain across the 108-case comparison, preserving analytic head-on sphere velocities. Oblique angular momentum error remains. In simultaneous three-body sphere collisions, final energy is only 5.91–6.44 J from 14 J at restitution 1, with insertion-order dependence; sixteen local sweeps barely affect those results. Three-body frictionless boxes lose 4.13–4.28 J. Local convergence is not a general multi-contact elastic solution. These results do not qualify the experiment for release.

The next isolated hypothesis repeats the entire color/overflow/generic restitution stage instead of each local chunk. The original local artifact is retained at `.absolutejs/impact-local16/rapier.mjs`; canonical source and hash permit rebuilding it.

## Global sweep result

Private graph-wide sixteen-sweep artifact `08ca14d345365fed5b29d8e572d0e03a7e15eb3efb8462da5f3fa85b98641421` preserves head-on analytic controls and removes positive box energy gain in the 108-case comparison. In simultaneous elastic sphere controls, it recovers the connected-constraint solution within 1.53e-7 m/s and retains 14 J. Frictionless three-box energy stays within 6.36e-6 J of 14 J. Frictional angular error and order dependence remain.

The new simultaneous-impact package regression fails on stable 0.8.0 and passes on the private candidate across timesteps/length units/insertion order. All 38 package tests pass (48,446 assertions). A complete game run is in progress in a separate checkout. Fixed-joint assemblies, performance cost and broader coupled constraints remain qualification gates. No public version or production policy is changed.
