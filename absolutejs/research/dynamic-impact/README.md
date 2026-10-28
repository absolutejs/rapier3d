# Private two-body restitution convergence experiment

Based on published Rapier 0.8.0. The game probe captures a 3.99134 J increase from 14 J at the first off-center box collision; the matching upstream 0.21.0 run has the same first-impact energy. CCD toggles do not affect this fixture, frictionless controls retain the gain, and more temporal subdivisions do not remove it consistently.

The canonical solver performs one end-of-step restitution sweep. This private experiment repeats that sweep 16 times within each Coulomb/twist contact chunk. It tests whether within-chunk convergence contributes to the excess energy. It is not a complete multi-contact restitution algorithm: no global coupling, generic multibody convergence, friction restitution consistency, or energy guarantee is established. It must not be published or adopted in the game.

Source, build and runtime evidence live here; no installed dependency cache is patched. Compile with two jobs in this checkout's own target directory. The existing native checksum guard is expected to reject the new artifact until a separately labeled research identity is recorded.
