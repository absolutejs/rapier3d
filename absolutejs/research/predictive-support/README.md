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

The copied baseline failure log was produced with the combined branch's Parry
type; this isolated harness is explicitly pinned back to c566aabd and will be
rerun against both exact baseline and corrected source. Full browser, game,
independent-build, no-std and release qualification are pending. Private only.

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
Full game, cost, feature and independent rebuild qualification remain pending.

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
nonapproaching exclusion and exact replay. Existing native controls, two-worker
and no-std checks are in progress; independent rebuilt bytes are still pending.
