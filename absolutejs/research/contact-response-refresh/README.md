# Private current-pose generic contact response experiment

Restore COM V2 restitution timing and the normal stabilization loop; the rejected early restitution and stabilization-ablation changes are not part of this experiment. Preserve the prior ablation dist separately.

Refresh generic normal/tangent Jacobians, inverse-mass responses, scalar effective masses and ordinary partner inertia at current poses. Both sides use one midpoint of current contact anchors. Preserve contact identity, row offsets, RHS and impulse history. Existing buffers must have sufficient capacity; no worker-stage growth is permitted. Value-only mass-property reconstruction avoids cloning optional boxed additional mass data. Soft-frame response and ordinary-only contact kernels are excluded from this experiment.

Refresh before generic warmstart, generic velocity solves, and delayed restitution. Update the multibody mass response after final integration as well as intermediate integration so post-integration contacts do not use an earlier factorization. This private version deliberately favors explicit response consistency over caching across repeated PGS iterations. Measure cost before considering production optimization.

Risks remain: restitution work/target policy, speculative-contact activation, transported warmstarts, same-articulation cross terms, general 3D spin, contact normals and surface-point choice. Preserve the elastic head-on gate, scoped conservation comparisons and exact snapshot replay. No release claim or game adoption until qualification.
