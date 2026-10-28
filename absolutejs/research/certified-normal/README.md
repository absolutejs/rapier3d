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

## Private .0 outcome — blocked

The one-job native build completed, all 227 package tests passed (86,823
assertions), and all 53 archived files match the candidate installation.
The immutable archive is backed up in the game research branch at
`artifacts/certified-normal/absolutejs-rapier3d-0.16.2-certified-normal-research.0.tgz`.
SHA-256: b90e2a3e97b4ef63de440e21ca6288e0bc3e872e12bb636bb9f9ec32e0734300.

The exact original snapshot's false contact falls from 319.68 mm to 0.000114 mm,
and one-step snapshot replays remain exact. However the unchanged full-tree
acceptance gates reject variant 0 at 960 Hz (20.867 mm below terrain) and 1920 Hz
(20.747 mm). Six focused tests pass and one fails. The 24-case, three-engine
matrix and exact onset snapshots are retained in the game's
`docs/certified-normal-qualification-2026-10-28/` directory. This is a research
candidate only; it is not fit for release or canonical adoption.

The next separate candidate tests a directly reproduced rotating-tip CCD
filter correction. Removing a false contact alone does not establish correct
physical settling. No acceptance tolerance or global iteration budget changes.
