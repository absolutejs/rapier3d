# Private pre-integration generic restitution experiment

Parent: root COM V2, 1aeded1. Game remains on published 0.9.0. This is not a shipping solution.

Consume each generic contact's negative prepared restitution seed in its normal constraint RHS, preserving it through the unbiased stabilization pass, and clear its delayed-bounce seed. Ordinary-body constraints remain unchanged. This tests whether solving rebound against prepared geometry before integration removes the measured stale-geometry impulse error. It deliberately keeps existing speculative-distance RHS and softness, so early bounce, distance truncation, persistent targets, friction and multiple contacts require independent controls. No measured momentum or energy correction is applied.

First controls: touching and separated fixed assemblies versus compounds, restitution 0/0.5/1, 60/240 Hz, 1/4 solver iterations. Native build restricted to two CPU jobs. Preserve V2 evidence and dist independently.
