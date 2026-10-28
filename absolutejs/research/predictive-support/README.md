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
