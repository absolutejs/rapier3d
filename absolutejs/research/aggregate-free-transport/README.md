# Private aggregate free-transport research — 2026-10-28

Based on published Rapier 0.14.1 at `06b02e8`. The package manifest is private;
the canonical game remains on registry 0.14.1. No native integration change has
been implemented at this first checkpoint.

Before changing the solver, `aggregate_frame.rs` audits existing mass-property
aggregation using authored relative joint transforms. It reconstructs each
link's transform in the root frame, sums its transformed mass properties, and
compares the result with a separate double-precision tensor/parallel-axis sum.
The 36-case matrix varies root choice, scale (0.001/1/1000), global attitude and
world translation (zero/one million). Aggregate root-frame COM, inverse moments
and principal frame are bit-identical across world translations/attitudes.
Maximum relative tensor reconstruction error is 2.119e-7; maximum COM error
divided by scale is 1.065e-7. This is a moderate-inertia fixture matrix, not a
proof for extreme thin bodies or many thousands of links.

The audit uses actual native multibody topology and stored local mass properties,
not a synthetic replacement model. It deliberately avoids reconstructing relative
poses by subtracting rounded distant world positions. The reference normalizes
quaternions in double precision and sums physical tensors independently.

Reproduce with Cargo manifest `absolutejs/research/aggregate-free-transport/Cargo.toml`,
`CARGO_HOME=/home/alexkahn/alex/hello-world/.cache/physics/cargo`,
`CARGO_NET_OFFLINE=true`, `CARGO_BUILD_JOBS=2` and checkout-local
`CARGO_TARGET_DIR=$PWD/.cache/aggregate-target`. Run `cargo test ... -- --nocapture --test-threads=1`.
Keep builds sequential with heavy game tests and avoid native WSL GPU work.

Next follow `../rigid-assembly/aggregate-frame-plan.md`: retain the actual incoming
aggregate COM velocity and angular state; advance them with a matched free-body
step; reconstruct root pose and generalized velocity; propagate coherent link
state. Admission starts with force-free, all-fixed, floating assemblies with no
contacts, external joints, locks, damping, armature, friction, springs or couplings.
Unsupported paths must retain their previous physical results. Treat the remaining
strict contact covariance bound and thin-moment storage as separate limitations.
