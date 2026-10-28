# Convex candidate pending; broad candidate rejected

The broad `.1` candidate passes package checks but fails one of 844 game tests:
generated terrain rejects variant 0 at all three simulation rates. Canonical game
stays on published 0.16.1. Independent/release qualification is postponed.
All 18 flat-floor drop cases pass, with substantial improvement in the targeted
pairs but small regressions elsewhere. `terrain/` preserves results and initial
snapshots for native reduction. The full game evidence is on
`research/predictive-recycle-qualification` at `f1522776`.

Baseline terrain controls pass unchanged at 480 Hz. Both engines with recycling
disabled reject 480 Hz and pass 960 Hz with identical measured physical limits.
Candidate clustering-off and 32-iteration controls pass at 480 Hz. These isolate
a real composite-contact interaction; no tolerance or game policy is changed.

# Predictive contact recycling investigation

Current state: private revision `.1` (exact-geometry fast path), native SHA
`6695b95a293fe0d5494b304badbbea1ee0333d09735d122ff27aac7c1886e68a`.
Package tests (227), GPU-disabled browser replay, one/two-worker native replay
and resting-stack checks, no-std and paired CPU controls pass. The isolated game
has the audited private archive installed; full game and independent rebuild
qualification remain pending. Nothing from this candidate is published.

The sections below retain the chronological experiments, including `.0`.

Base: published Rapier 0.16.1, source/receipt `60d97a6`. The canonical game
uses that registry release. This checkout and package identity are explicitly
private; no new kernel is qualified. The unchanged-native baseline and later candidate checkpoints are recorded below.

Game evidence `9e366816` preserves exact initial, first-crossing and peak
replays for real cut-tree proxies. Initial cross-body convex queries find no
negative distances. Four first-observed 1 mm crossing steps reproduce exactly.
Disabling recycling from those same snapshots reduces the next-step fresh
penetration from 11.471 to 0.319 mm for the floor fixture, and from
3.941/2.346/1.458 to 0.731/0.802/0.453 mm for fragment fixtures at three rates.
Higher iteration/CCD budgets and disabling clustering do not remove the onset.

At the bad steps, stored solver contacts still have positive cached separation
and positive current anchor separation while fresh native shape queries are
negative. Source inspection finds that `has_any_active_contact` includes
predictive contacts, allowing their feature set to freeze across the configured
5 cm drift window. The proposed bounded correction refuses reuse when a pair
has solver contacts but all remain separated in their cached data. Touching
contact sets and genuinely empty pairs retain their existing admission path.
This is a hypothesis until the exact captures and stability controls qualify it;
it does not establish safety for every mixed touching/predictive manifold.

`probe.rs` imports the real version-1 snapshots, including pending connectivity
state, and queries the selected convex pair at current body poses. Native and
WASM arithmetic are reported separately; cross-backend byte identity is not
assumed. Builds use two Cargo jobs, offline verified dependencies and a checkout-
local target. No GPU tests or PAAS edits are involved.

## Native baseline reproduced

The unchanged native engine reproduces the four selected onset penetrations:
11.471/3.941/2.346/1.458 mm with recycling. With recycling disabled, the
selected floor pair is separated by 0.397 mm and the three selected fragment
pairs penetrate 0.731/0.802/0.453 mm. These are selected-pair observations; the
WASM whole-world floor maximum was a different pair at 0.319 mm. No native/WASM
byte identity is assumed. The native replay consumes the complete version-1
world and pending-event state. Candidate admission checks are now compiling.

## Private native candidate

The admission change refreshes pairs whose cached solver contacts are all
positive-distance predictions. Empty-pair bounds and touching-contact reuse
remain as before. It adds no policy default, snapshot field or public API.
The four captured selected pairs stay below 1 mm over eight native replay steps;
all 32 complete native replay states match exactly. The 1/8/16-box resting
stacks remain upright and sleep after 1,200 steps. These two native regression
tests pass; this does not yet establish browser behavior, general stack cost,
full tree-drop quality, or unchanged behavior in mixed predictive/touching pairs.

A browser/SDK regression is prepared from the exact same snapshots. The browser
will verify both fixture hashes, eight complete replay states each, and read-only
current-pose queries. WASM compilation, broader tests and cost qualification are
pending. The package remains private and unqualified for release.

## First WASM candidate and cost

Private candidate `.0` builds native SHA-256
`4bde097f1459a254eb5903cb487be94fb8ccf4b07346dcb042f74c62f3effdf8`
(3,357,140 bytes). All 227 package tests pass (86,823 assertions), and the
GPU-disabled browser verifies two captured predictive-pair fixtures with eight
exact replays each. The first qualification-guard rejection is retained before
updating the explicitly private hash manifest.

The paired cost probe passes physical-repeat and stability bounds. Median paired
ratios are 1.137 for 32 motionless predictive pairs, 0.964 for an active 16-box
resting stack, and 1.062 for 32 falling boxes. Smaller/noisy differences are not
a general speed claim. The motionless-pair result motivates an exact-geometry
fast path: no change in relative pose or either world rotation means the cached
features and frozen normal/arms are unchanged. Moving predictive pairs must
still refresh. `.0` is preserved as an audited private archive, not published
or adopted. Its first pack attempt lacked the destination directory; the
corrected pack and audit pass. New-source qualification will be separate.

## Exact-geometry fast path

Private revision `.1` additionally reuses predictive contacts only when the
relative pose and both world rotations are exactly equal to the cached values.
This preserves features and frozen world-space normals/arms under unchanged
geometry (including common translation); it does not introduce approximate
equality or a new tolerance. Both native tests still pass, including all 32
exact captured replay states and the three resting-stack sizes. The second
WASM build and new cost measurements are pending. The first archive remains
backed up independently; no package is published or adopted from this work.

The optimized WASM SHA-256 is
`6695b95a293fe0d5494b304badbbea1ee0333d09735d122ff27aac7c1886e68a`
(3,356,980 bytes). All 227 package tests and the GPU-disabled browser pass.
Against published 0.16.1, optimized median paired CPU ratios are
0.983/0.939/1.024 for stationary predictions/resting stack/falling grid. A direct
`.0` versus `.1` comparison gives 0.877/0.894/0.962. Different run wall times
reflect host variation; retain paired samples rather than interpreting absolute
times across runs as a speed guarantee. The stationary and falling physical
records are exact across private candidates. The resting-stack trajectory
changes: `.0` leans by centimetres while `.1` stays within millimetres laterally
of the baseline; both passed the original stability bounds. Do not claim full
physical parity for that scene. `cost-summary.json` preserves each comparison.

Two-worker feature checks, no-std, independent rebuild and full-game/real-tree
qualification remain pending. The canonical game still uses published 0.16.1.

The two-worker native feature tests pass with a bounded two-worker pool and
serial test execution. The allocation-enabled no-std check passes through the
existing isolated harness. The first root-workspace check could not load an
omitted upstream C-testbed workspace member; its log is preserved and the
working isolated command is used instead. The optimized private archive audits
all 53 files and is installed byte-exactly in the isolated game checkout.

## Native terrain reduction

Corrected airborne snapshots reproduce rejection natively at 960/1920 Hz,
but the native 480 Hz path passes. These backends are not byte-equivalent;
native controls do not replace actual WASM game qualification. The generated
terrain uses composite triangle manifolds and clustering; all four original
onset fixtures instead use pairs of convex shapes. The broad first candidate
is rejected. Next qualification will restrict the new predictive reuse rule
to two convex shapes, retaining existing composite contact behavior while the
separate composite interaction is reduced. This scope is explicit, not a claim
that triangle-mesh predictive contacts are solved. No gate will be relaxed.

## Convex-only candidate `.2`

Source `bd780bb` restricts the predictive-refresh admission change to pairs
where both shapes report convex. Composite pairs retain the original recycle
predicate, including original drift/rotation/change/hook guards. Exact-pose
reuse remains for convex pairs. Two native regression tests pass: 32 exact
onset replay states plus 1/8/16-box resting stacks. New WASM build, exact
terrain parity, package/browser/cost and full-game qualification are pending.
The broad `.1` candidate remains rejected, and no new release is authorized
by these partial results.

The `.2` WASM SHA is `f1539c74bb9192cf8f6dfaa95bb6654a605d326faa0bdd02939d798a455bc57c`
(3,357,159 bytes), prepared-source snapshot `41a29548f26642f7ec27328a368dc9343e6a2759ea867be82af887e575c85825`.
All 227 package tests and the GPU-disabled browser pass. Its 53-file archive
is audited and installed exactly in the qualification game. All four generated/
excavated terrain cases match published 0.16.1 in every drop and attempt field
except elapsed time (491 poses). The full game suite is running.

Bounded CPU median paired ratios versus 0.16.1 are 0.992/0.988/1.047 for
stationary predictions/resting stack/falling grid. All original stability
bounds pass. All three physical records exactly match private `.1`; the
resting-stack trajectory differs from published 0.16.1 as recorded earlier.
The short terrain comparison overlapped this benchmark's start; retained
paired samples are limited CPU evidence, not a hardware FPS or speed claim.

Final-source two-worker tests pass on the one-compiler-job retry (two native
tests, including exact captured replays and resting stacks). The first compile
ended with SIGTERM/143 before any test result; its log and memory/disk readings
are retained, with no asserted cause. The isolated allocation-enabled no-std
check also passes. An independent checkout at `281dfe7` now builds with its own
target directory and verified bindgen archive; byte comparison is pending.

The game qualification branch checkpoints are `2179fbe1` for all 844 tests
and `81301502` for 18 full-drop physical comparisons. Both are pushed.
