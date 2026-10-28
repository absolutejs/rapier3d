# Private pre-integration generic restitution experiment

Parent: root COM V2, 1aeded1. Game remains on published 0.9.0. This is not a shipping solution.

Consume each generic contact's negative prepared restitution seed in its normal constraint RHS, preserving it through the unbiased stabilization pass, and clear its delayed-bounce seed. Ordinary-body constraints remain unchanged. This tests whether solving rebound against prepared geometry before integration removes the measured stale-geometry impulse error. It deliberately keeps existing speculative-distance RHS and softness, so early bounce, distance truncation, persistent targets, friction and multiple contacts require independent controls. No measured momentum or energy correction is applied.

First controls: touching and separated fixed assemblies versus compounds, restitution 0/0.5/1, 60/240 Hz, 1/4 solver iterations. Native build restricted to two CPU jobs. Preserve V2 evidence and dist independently.

## Rejected result

WASM SHA256 748369860030f7df5afd7ee4d812836241c0ab86c593e1588817182d4e41a498, 3,297,247 bytes. Compilation completed in 6m50s; expected hash guard rejection preceded explicit private API packaging. Package tests: 44 pass, 1 fail. The prior V2 build passes all three writeback tests; this candidate fails elastic velocity transfer by 1.884563 m/s. A 144-case game matrix confirms unchanged compound/zero-restitution controls and improved momentum, but higher maximum energy gain. Separate head-on probes lose about half the initial energy, including with contact bias disabled. Do not publish or merge this experiment. Retained evidence: hello-world/docs/restitution-timing-2026-10-28.
