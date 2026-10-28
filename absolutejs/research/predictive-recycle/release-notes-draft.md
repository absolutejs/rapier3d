## Predictive convex contacts (0.16.2)

Moving convex pairs now refresh separated predictive contacts instead of reusing
stale closest features across the contact-recycling drift window. Captured tree
fragments could previously penetrate while the cached anchors still reported
separation. Exactly unchanged relative geometry and world rotations retain
reuse, as do the existing empty-pair and touching-contact paths. This adds no
public setting, solver-iteration increase or snapshot-layout change.

The new rule applies only when both shapes are convex. Composite triangle,
heightfield and compound contact recycling retains its prior behavior. A broader
candidate regressed real generated-terrain support and was rejected; its captures
and controls remain in the research record. Mixed touching/predictive sets and
general composite-contact accuracy remain separate qualification work.

Qualification includes 227 package tests, 844 game tests, exact captured replay,
one/two-worker native checks, allocation-enabled no-std, GPU-disabled browser
checks and 18 full tree-drop cases. Four generated/excavated terrain cases retain
all measured physical fields and 491 poses exactly versus 0.16.1. The originally
bad flat-floor tree cases improve from roughly 7–12 mm cached penetration to
below 0.6 mm; other cases can change within their original limits. These cached
measurements are not continuous authored-material penetration guarantees.

Bounded paired CPU ratios versus 0.16.1 were about 0.99/0.99/1.05 for stationary
predictions, resting stacks and falling boxes. The stack trajectory changes but
passes its original stability limits. These fixtures do not measure hardware
FPS or establish a general speedup. See `absolutejs/research/predictive-recycle/`
for source, failed candidates, controls and qualification receipts.
