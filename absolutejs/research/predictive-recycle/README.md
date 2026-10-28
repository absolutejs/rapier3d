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
