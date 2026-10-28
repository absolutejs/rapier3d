# Predictive contact recycling investigation

Base: published Rapier 0.16.1, source/receipt `60d97a6`. The canonical game
uses that registry release. This checkout and package identity are explicitly
private; no new kernel is qualified. Native source is still unchanged while
the baseline fixture builds.

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
