# Candidate 7: tied-target collection alone is insufficient

The sweep now retains a vector of equal-earliest target bodies and the splitter
sorts/deduplicates wake handles. All 12 simultaneous-impact cases still fail.
The convex cast helper rejects impacts equal to max_fraction, so subsequent tied
colliders never reach the vector. The nonlinear and moving-compound helpers also
use strict upper limits. Next: accept real equal-boundary hits while rejecting
Separated status, preserving initial-overlap policy and endpoint semantics.

This is a recorded failed intermediate experiment, not a release or a physical gate
pass. No broad test run was used to conceal the focused failure. Native/API build
receipts, kernel provenance and exact failing cases are retained.
