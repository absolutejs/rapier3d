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

## First native integration checkpoint

The private native path is now wired for explicitly isolated force-free rigid
assemblies. It caches aggregate mass properties and the actual incoming COM/
angular state once per island solve. It applies the matched free rotation,
advances aggregate COM, reconstructs root pose/velocity and writes both native
generalized storage and link states. Native free-flight acceleration increments
are not applied twice. Rejections return to the existing path and remain rejected
for the rest of that island solve. Ordinary-body observations are unchanged;
separate native-only assembly counts identify accepted/nonphysical/cap/other
attempts. These observations are not yet exposed in the TypeScript API.

The first actual-engine matrix covers 36 one-second cases: three scales, three
roots, 60/240 Hz and one/four substeps. All 13,500 substeps are admitted with no
rejections. Maximum relative linear-momentum, angular-momentum and energy drift
are respectively 6.288e-6, 1.739e-6 and 2.564e-6; maximum COM error divided by
scale is 3.235e-6. The independent physical measurement sums actual per-link
linear/spin energy and orbital/spin angular momentum, including local COM and
principal-frame rotations. It initializes authoritative generalized velocities;
it does not assume body descriptor velocities initialize an articulation.

These are early candidate results, not a release. Excluded-path comparison,
independent trajectory convergence, root-order equivalence, snapshots, two-worker
execution, thin-body admission and performance costs remain to be qualified.
No WASM build or game adoption has been performed for this experiment. The first
compile error (an omitted scalar type parameter) is retained. Candidate source
is isolated from the canonical published 0.14.1 game/package delivery.
