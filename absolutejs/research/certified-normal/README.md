# Certified GJK normal engine qualification (private)

This branch replaces the rejected persistent-frame Parry pin with a26d29f,
based directly on published collision source c566aabd. Rapier native production
source is unchanged from 0.16.2; no persistent triangle frames are included.
The prior frame candidate's exact archive/results remain on the preceding
research/composite-contact-reduction branch and in the game's artifacts.

The new Parry candidate retains the support direction that certified a stalled
GJK query's separated/touching classification. Four exact before/after and
shape-order fixture tests and 83 library unit tests pass. The library test
harness uses unchanged selected-feature runtime dependencies and exact source;
it also fixes missing imports/discard annotations in existing test-only code.

Private WASM/package tests, original snapshot replay and the 24-case three-way
whole-tree comparison come next. No release qualification or adoption is implied.
Do not change game rejection limits or blanket solver budgets. The separate
rotating-tip CCD misses remain open; no claim they cause the tree rejection.

The contact-frame API plan on the rejected branch does not apply to this
candidate: stored contact frames and their public coordinate semantics are
unchanged here. Qualify actual bytes and behavior before considering publication.
