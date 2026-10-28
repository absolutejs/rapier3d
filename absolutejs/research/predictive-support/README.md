# Isolated predictive-support qualification

Base: published 0.16.2 receipt b113d14. This candidate includes only the two-file
solver admission/reduction fix first reproduced at ff2365a. Collision library
remains the exact published Parry c566aabd; no GJK-normal, persistent triangle
frame or conservative-CCD candidate is included. The combined experiments and
their failed game acceptance remain backed up on their research branches.

The old reducer filters by current distance before velocity or contact skins can
qualify a point. A tilted moving patch loses both outer supports in the strict
baseline reproduction. The correction shares the existing complete eligibility
predicate with reduction and final admission. No solver budget, acceptance
threshold or material coefficient changes; no new heap allocation.

The first copied baseline failure log was produced with the combined branch's
Parry type. The independent isolated rerun below uses published c566aabd; the
original log is retained as historical evidence. This remains a private candidate
until independent-build and release archive qualification finish.

The isolated published-source baseline now independently reproduces the failure
(`isolated-baseline-test.log`, expected exit 101). The preserved baseline reducer
is byte-identical to b113d14. All five corrected tests pass with published Parry
c566aabd (`controls-test.log`). Run `--test predictive-support` for the positive
suite; `--test baseline-support` is deliberately failing historical evidence.

## Initial isolated browser/game gates

The native WASM build succeeds in 6m28s. All 236 package tests pass (86,879
assertions), including nine public-API regression tests covering three scales,
both collider insertion orders, nonapproaching controls and exact snapshot
replay. The GPU-disabled browser worker passes six support-patch/replay cases
alongside the existing physics qualification. Public probe: the published engine
retains only three solver points on one edge from eight geometric contacts;
this isolated candidate retains four points spanning both sides.

The first archive command lacked the output directory; its failed receipt is
retained. The script now creates that directory. Audited archive SHA-256:
`badfff5ed31cb317fa0d70243d0127c990e2f28330b3448e002492b6275b59b6`.
All 53 installed game files match. No new rejections occur in 24 paired terrain
cases. All four generated/excavated work cases and 18 flat-floor tree cases pass.
Physical results change in some cases; no universal improvement is asserted.
Full game, cost and feature qualification subsequently completed as recorded
below. Independent rebuild and public release qualification remain pending.

## Full-game and CPU checks

The isolated game passes all 844 tests (7,408,742 assertions), types, dependency
checks and worker bundling. Qualification and exact archive are pushed on
`research/predictive-support-qualification` at 8bbeca2f. Twenty of 24 terrain
rows retain recorded physical fields exactly; four change with no new rejection.
The existing raw variant-0/1920 rejection remains. Actual adaptive terrain work
passes all four generated/excavated cases, and all 18 flat-tree cases pass.

Three alternating paired CPU control scenes preserve final physical states
exactly. Median ratios candidate/baseline are 1.033, 1.051 and 0.951. The affected
moving-patch probe ratio is 0.945. These are observations on a shared host, not
hardware FPS, universal performance or speedup claims; see complete samples.
No new allocation is introduced by the production correction.

Three native engine tests pass for scaled/reordered approaching support,
nonapproaching exclusion and exact replay. Both prior native controls pass. The
two-worker build passes all five tests (two prior controls plus three support
regressions), and the allocation-enabled no-std check passes. Compilation used
one Cargo job. The recorded resource snapshot is a point-in-time observation,
not peak usage or a crash diagnosis. Independent rebuilt bytes are still pending.

## Public archive qualification

Independent native builds have identical source manifests and match all 49
distribution files and packaged WASM. Raw executable/data sections match; only
unshipped wasm-bindgen custom metadata differs. The public 0.16.3 archive also
matches the independent distribution. Private/public archive comparison permits
only package/kernel version labels and documentation; all other runtime and
declaration bytes are identical. Eleven public focused tests (73 assertions) and
the GPU-disabled browser regression/replay pass.

Public archive SHA-256:
`bed2618729b0e70fec71a6c926846d053e4f001309b2636e9c3c80780a2f9863`.
Publication and canonical game adoption are still pending; do not infer registry
availability from the completed archive qualification.

## Publication verified

npm accepted 0.16.3, then returned 404 during propagation. The fourth registry
check verifies metadata and downloaded SHA-256/SHA-1/SHA-512 against the audited
archive. No republish occurred. See publication-verified.json. Canonical game
adoption is the remaining delivery step.
