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

## Baseline, exclusion and root-choice controls

The extended native candidate and retained 0.14.1 source pass four harness tests.
All 386 excluded/rejected pose/velocity records match exactly, including default
and body damping, gyro disabled, fast rotation, force/torque/gravity, armature,
friction, springs, an external joint, active contact, locks, hinges, nonphysical
inertia, unrepresentable aggregate mass and angular cap rejection. Contact/cap
controls inspect their first step; other controls span 24 steps. Numeric invalid
aggregate mass is explicitly rejected before constructing a cached state.

Every free-case metric improves versus 0.14.1. Maximum relative linear momentum
drift drops from 0.2173544 to 6.288e-6, angular momentum from 0.0542058 to 1.739e-6,
energy from 0.0612009 to 2.564e-6, and scale-normalized COM error from 0.1773211
to 3.235e-6. These remain synthetic fixture measurements, not gameplay guarantees.

Equivalent physical initial conditions with three different roots now agree
within 3.791e-6 m in COM positions, 2.343e-6 rad in attitude and 8.835e-6 m/s
in linear velocity over one second. The old path's maxima are about 0.2404 m,
0.04836 rad and 0.5131 m/s. Authored-frame invariance at distant world coordinates
is a mass-property guarantee only; float32 position resolution still requires
the game's normal local simulation coordinates/rebasing.

The first 362-control comparison and original logs/scripts are retained; the
expanded comparison adds aggregate mass overflow. The native square root now
uses num-traits for no-std compatibility, but a complete no-std build has not yet
been qualified. Uniform gravity is currently excluded: admitting free fall is
a separate next step, with explicit force semantics and discrete work checks.

## Independent trajectory check

Nine root/rate fixtures compare the native engine with independently refined
RK4 trajectories (7,680 versus 15,360 reference steps). Reference refinement
changes attitude by at most 5.206e-14 rad and momentum by 1.629e-13. The generator
records source/input hashes, reconstructs exact f32 values from Rust's printed
inputs, uses the actual float32 timestep duration, and commits its small text
fixture so a fresh checkout does not depend on an ignored CSV.

Both double-precision matched integration and native motion show second-order
trajectory convergence at 60/120/240 Hz. Native attitude error versus RK4 falls
from about 0.003782 rad to 0.000947 rad to 0.000234 rad over one second. Native
versus matching double-precision integration differs by at most 3.984e-6 rad;
that storage difference is not the total physical trajectory error. This check
uses the native stored aggregate tensor, whose reconstruction error is measured
separately above. It does not prove arbitrary-contact trajectory accuracy.

## Uniform gravity extension (private, qualification in progress)

The candidate now admits uniform gravity only when every link has the same
finite gravity scale, no user force or torque, and the effective native force
exactly matches the native gravity calculation. Differential gravity remains
excluded. The historical exclusion logs above tested the earlier zero-gravity
scope; new paired logs are required for the expanded admission rule.

All 72 initial gravity cases passed: three scales, three roots, two rates,
one/four substeps and gravity scales 0.5/1. Maximum normalized momentum error
was 6.107e-6, relative angular-momentum error 2.020e-6, relative spin-energy
error 2.933e-6, scale-normalized COM error 3.853e-6, and normalized gravity-work
residual 1.253e-5. The linear oracle deliberately uses the native semi-implicit
kick-then-drift convention; this is not exact continuous falling position or
a second-order linear integrator. Spin and angular momentum are measured about
the moving aggregate COM. Source remains private and has not been adopted by
the game or released to npm.

The complete single-worker run now passes nine tests. All 386 excluded/rejected
physical state records remain byte-identical to published 0.14.1, including
differential gravity. All five measured errors improve in every one of the
72 falling cases; `compare-gravity.py` verifies this against the retained
baseline. Three changing-gravity cases also improve every measured error,
covering direction changes, zero gravity and zero/negative gravity scales.
Their maximum COM-velocity error is 2.721e-6 m/s and position error 5.151e-7 m.

Detaching every joint after 24 moving frames preserves each link's pose and
velocities exactly at the removal boundary. After 120 independent-body frames,
relative linear-momentum error is zero, maximum relative angular-momentum error
is 1.731e-5, relative energy error 8.523e-8, and aggregate COM-position error
1.088e-5 m. Assembly admission counts remain zero after separation. This tests
complete detachment; partial subtrees, contacts during fracture and fracture
energy/material models remain unqualified.

The same nine native tests also pass with an explicitly configured two-worker
thread pool (79.53 seconds). The fixture verifies that it actually configured
two workers. This is correctness coverage, not a parallel speedup benchmark.
The TypeScript assembly observation API and bounded profile integration are
now implemented but remain pending the new WASM build and package tests.

The isolated allocation-enabled no-std crate compiles successfully. The original
workspace check failure is retained: missing upstream C testbed files prevented
that invocation from loading the workspace. The isolated harness resolves the
actual local physics crate without that unrelated workspace member. Admission
also explicitly rejects nonfinite effective gravity forces before attempting
integration. Browser/WASM, independent rebuild and game adoption remain pending.
