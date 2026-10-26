# Candidate 10: reusable contact-policy diagnostics

Source commit 0b61306 adds validated public contactRecycling,
normalizedContactRecycleDistance and warmstartCoefficient controls. Defaults remain
true, 0.05 and 1. No solver algorithm was changed in this candidate. The separate
release branch carries only these bindings/tests, not the research solver changes.

Six focused tests pass 542 assertions: defaults, valid updates, native snapshot
restoration, matching resumed trajectory, invalid inputs rejected before mutation, and solid-floor contact response with recycling/warm-start combinations.
Strict type-contract checks include positive use and rejected wrong types. Full
research suite before the four extra floor-response cases: 13 pass, 2 retained upstream numerical-parity failures, 47,304
assertions. All 512 body/contact state hashes match candidate 9 with default controls;
a fresh canonical capture also matches its initial and 128 subsequent hashes.

Contact-response experiments live in the game docs. Stiffer contact frequency reduces
cold sampled material overlap, but no setting qualifies the geometry yet. Recycling
and warm-start interventions remain isolated; their availability is diagnostic
capability, not a new game policy. Candidate 10 is still private and unreleased.
