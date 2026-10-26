# Kinematic activation experiment, intermediate build 5a

Private research only. Build 5a precedes the final minimum-duration remainder
accounting correction in candidate 5. Its generated kernel provenance is retained.
The inherited native build completed after context recovery; a second Cargo command
waited on its artifact lock. Their shared log has interleaved output and NUL padding;
the final candidate requires a clean incremental receipt. No parallel native
compilation occurred (Cargo's artifact lock serialized the two commands).

- Twelve three-step kinematic cases: no prescribed-endpoint failures. Four of eight
  multi-substep cases still cross: both velocity/position kinds against sleeping
  dynamic targets, at caps four and sixteen. Awake cases improve from crossing to
  pushing the target. Cap one remains unable to resolve these prescribed impacts.
- Six translation/rotation path cases including offset centers of mass: endpoints
  retained under unrelated dynamic collision subdivisions.
- 135 sphere cases: no crossings/energy gains. Reference-frame error unchanged.
- Solid/sensor/collision-group/solver-group regression passes.
- Five sleeping-target filter cases: the solid case fails physical resolution;
  other four controls retain the target position and sleeping state.
- Package suite: ten pass, two existing upstream numerical-parity failures, one
  ten-second work-budget failure during concurrent native compilation. Keep this
  failed run; run final qualification without compiler contention. Do not relax
  the budget or parity assertions.

The solid sleeping-target test emits a contact event and eventually wakes the body,
but the body receives no impulse during the crossing. Next experiment: wake actual
earliest solid CCD participants before solving, excluding sensors/filtered pairs.
