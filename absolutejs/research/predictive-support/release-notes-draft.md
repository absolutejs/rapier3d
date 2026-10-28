## Approaching contact support (0.16.3)

Contact-patch reduction now applies the same contact-skin, soft-body and
velocity-prediction eligibility rule as final solver admission. Previously,
reduction filtered outer points by current distance alone. An approaching tilted
box could consequently receive support along just one edge even though points
on the opposite edge qualified for the solver. The regression now retains four
support points spanning both sides, across three scales and both insertion orders.
Stationary and receding outer points remain excluded by the existing rule.

This is a two-file solver correction. It changes no public API, snapshot layout,
material coefficient, solver budget or admission tolerance. Published Parry
c566aabd is unchanged; the separate GJK-normal, persistent triangle-frame and
conservative-CCD experiments are excluded. This release does not solve the
remaining generated-heightfield or rotational direct-sweep limitations.

Qualification includes 236 package tests, 844 game tests, exact snapshot replay,
GPU-disabled browser tests, native one/two-worker controls and allocation-enabled
no-std. The 24 paired terrain controls add no rejection, but the existing raw
variant-0/1920 rejection remains. Four actual generated/excavated work requests
and 18 flat-floor tree cases pass their original limits. Twenty of 24 paired
terrain rows retain their measured physical fields exactly; others change.
These checks do not establish continuous authored-material separation.

Bounded paired CPU ratios versus 0.16.2 were approximately 1.03, 1.05 and 0.95
for stationary predictions, resting stacks and falling boxes, with identical
final physical fields. The affected tilted-patch ratio was 0.95. These shared-host
observations are not hardware FPS or a universal speedup claim. See
`absolutejs/research/predictive-support/` for complete evidence and limitations.
