# Private current-pose generic contact response experiment

Restore COM V2 restitution timing and the normal stabilization loop; the rejected early restitution and stabilization-ablation changes are not part of this experiment. Preserve the prior ablation dist separately.

Refresh generic normal/tangent Jacobians, inverse-mass responses, scalar effective masses and ordinary partner inertia at current poses. Both sides use one midpoint of current contact anchors. Preserve contact identity, row offsets, RHS and impulse history. Existing buffers must have sufficient capacity; no worker-stage growth is permitted. Value-only mass-property reconstruction avoids cloning optional boxed additional mass data. Soft-frame response and ordinary-only contact kernels are excluded from this experiment.

Refresh before generic warmstart, generic velocity solves, and delayed restitution. Update the multibody mass response after final integration as well as intermediate integration so post-integration contacts do not use an earlier factorization. This private version deliberately favors explicit response consistency over caching across repeated PGS iterations. Measure cost before considering production optimization.

Risks remain: restitution work/target policy, speculative-contact activation, transported warmstarts, same-articulation cross terms, general 3D spin, contact normals and surface-point choice. Preserve the elastic head-on gate, scoped conservation comparisons and exact snapshot replay. No release claim or game adoption until qualification.

## Measured result

WASM f22e1f95f335728918c4d62c8b79cd74ea3f9f758306c0d465d301754536e30c, 3,301,195 bytes. Build 4m31s, private API packaging succeeds. All 45 package tests pass (57,649 assertions), including elastic velocity transfer. Game evidence contains 96 frictionless comparisons, 16 friction controls, 80 exactly unchanged free-motion controls and paired CPU timing. Momentum errors improve substantially, but elastic energy deviations remain at roughly .01–.02 J. Current geometry plus the prepared velocity target independently predicts the remaining touching bounce work within 8.086e-6 J. Keep unqualified pending restitution-work and wider articulation qualification. See hello-world/docs/contact-response-refresh-2026-10-28.
