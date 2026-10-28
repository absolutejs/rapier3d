# Private two-body restitution convergence experiment

Based on published Rapier 0.8.0. The game probe captures a 3.99134 J increase from 14 J at the first off-center box collision; the matching upstream 0.21.0 run has the same first-impact energy. CCD toggles do not affect this fixture, frictionless controls retain the gain, and more temporal subdivisions do not remove it consistently.

The canonical solver performs one end-of-step restitution sweep. This private experiment repeats that sweep 16 times within each Coulomb/twist contact chunk. It tests whether within-chunk convergence contributes to the excess energy. It is not a complete multi-contact restitution algorithm: no global coupling, generic multibody convergence, friction restitution consistency, or energy guarantee is established. It must not be published or adopted in the game.

Source, build and runtime evidence live here; no installed dependency cache is patched. Compile with two jobs in this checkout's own target directory. The existing native checksum guard is expected to reject the new artifact until a separately labeled research identity is recorded.

## Local sweep result

The private WASM `262872baa26f283464bfb24fa7b0651ab8137839225e15d3c101708c74faa37a` removes positive box energy gain across the 108-case comparison, preserving analytic head-on sphere velocities. Oblique angular momentum error remains. In simultaneous three-body sphere collisions, final energy is only 5.91–6.44 J from 14 J at restitution 1, with insertion-order dependence; sixteen local sweeps barely affect those results. Three-body frictionless boxes lose 4.13–4.28 J. Local convergence is not a general multi-contact elastic solution. No release is authorized by these results.

The next isolated hypothesis repeats the entire color/overflow/generic restitution stage instead of each local chunk. The original local artifact is retained at `.absolutejs/impact-local16/rapier.mjs`; canonical source and hash permit rebuilding it.
