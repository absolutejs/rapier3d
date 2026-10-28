# Native matched midpoint candidate — 2026-10-28

Private research based on published 0.13.0. `src/dynamics/rigid_midpoint.rs` is
compiled directly by this no-std harness but is **not wired into the engine**.
The game remains on the published, independently qualified 0.13.0 package.

The torque-free update solves body-frame momentum by implicit midpoint, then
returns the matching Cayley rotation. It preserves the complete world angular
momentum vector, not only its length. No measured invariant is clamped. A bounded
3x3 Newton solve returns explicit invalid/nonfinite/singular/budget errors with
no partial result. This is not yet a production failure policy.

The principal-frame wrapper derives inverse moments from the same supplied
principal moments in double precision. It applies the calculated change to the
incoming world velocity, avoiding repeated reconstruction through separately
rounded f32 moments/inverse moments. Body and principal-frame quaternions are
handled separately.

Seven tests pass. Twelve scale/inertia cases cover 28,800 steps: maximum relative
energy error 7.11e-15, world-momentum-vector error 1.49e-14, two Newton updates.
After storage through f32 fields every step, a tilted body/frame test has maximum
relative energy error 2.807e-6 and momentum error 1.460e-6 across 2,400 steps.
Principal-axis f32 velocity fields remain exactly unchanged. Reversibility,
invalid inputs and known Cayley principal-axis angle are checked.

Conservation alone is insufficient: twelve one-second trajectories at 60/120/240
Hz converge at second order toward independently refined RK4 data. The generator
checks 7,680 versus 15,360 RK4 steps, records all input hashes, and saves the CSV
fixture/receipt. It uses committed reference sources from the sibling
`rapier-rigid-reference` worktree (research source at 5187717).

Run the exact canonical Rust source through the small harness:

```sh
cargo test --locked --offline --manifest-path absolutejs/research/rigid-midpoint-native/Cargo.toml -- --nocapture
```

Use two compile jobs and durable isolated target/shared Cargo cache as in existing
native qualification. No browser GPU workload is involved.

Next: qualify the admission boundary against native float conversions and
investigate integration ordering. The current contact solver solves velocities, integrates positions and
performs later constraint passes using prepared responses. Inserting a free
rotation update into that flow without compatible contact/joint response handling
would not establish coupled conservation. No production integration or full-game
claim is made by these arithmetic tests.

## Conditioning and cap boundary

The original momentum-variable Newton system falsely reported a singular
Jacobian for physically valid thin bodies; `thin-body-baseline.log` preserves
that failure. The equivalent solve now uses angular velocity. Euler coefficients
are `(I_j-I_k)/I_i`; physical inertia satisfies `|I_j-I_k| <= I_i`, so these
coefficients remain bounded while the old momentum Jacobian could contain huge
principal-moment ratios. The returned momentum still uses the same midpoint
relation and matching Cayley attitude. Its reported residual is now explicitly
in radians/second.

Nine tests pass after this change. In addition to the previous trajectories and
f32 controls, 4,500 deterministic physical-inertia/scale/rotation cases reach at
most four Newton updates, maximum relative energy error 2.78e-14 and world
momentum error 9.11e-14. Thin moments down to a 1e-30 ratio no longer trigger the
artificial singularity.

Four stress cases show why solver integration cannot be blind: a step whose
initial angular speed is at the existing full-step cap can have a midpoint
rotation slightly exceeding that cap, even while conserving energy and momentum.
The exact input cases are printed in `conditioned-stress-final.log`. Cap policy,
locked axes, external torque, damping and constrained bodies require explicit
admission/handling. These arithmetic results still do not qualify an installed
engine change.

## Stored-inertia correction and explicit admission boundary

The earlier description of all 4,500 inputs as physical was too broad. Their
source covariance is positive, but independently rounded principal moments (and
reconstruction from reciprocals) can violate the physical triangle inequality.
The audit in `stored-inertia-audit.log` identifies 1,110 such stored inputs; the
largest absolute Euler coefficient is 1.781754 instead of at most one. All four
observed cap exceedances are in this group. No cap exceedance was observed among
the remaining inputs; this is a sampled result, not a proof that a cap check is
unnecessary. The original stress cases and failed classifications are retained.

The new principal-moment entry point removes the unnecessary inverse-to-moment
round trip. The rigid-frame wrapper uses it directly. The separate
`bounded_midpoint_step` admission boundary rejects nonphysical stored moments,
invalid angle limits, nonlinear failures and an excessive actual Cayley angle.
It returns no partially updated state and never clamps momentum or energy.
It is not yet wired into the native engine. Very thin tensors whose independently
rounded moments are nonphysical need a deliberate upstream representation policy;
adding a relative tolerance here would hide a potentially large Euler error.

Twelve tests pass (`admission-boundary.log`). A separate matrix contains 3,072
exactly representable physical covariance cases, both time directions, three
power-of-two scales, principal-axis and off-axis motion. Accepted states retain
energy and full world momentum to relative 1e-12. Rejected inputs, actual cap
violations and tiny-but-physical moments have explicit tests. An initial test
incorrectly assumed decimal rescaling preserves a particular triangle violation;
`decimal-rescaling-fixture-failure.log` records that failure. Power-of-two scaling
preserves the intended binary fixture instead.

### Native integration obligations

Source audit at the current 0.13.0 base:

- `worker.rs` applies gyroscopic correction during each velocity-increment stage,
  before contact and joint solves. Pose integration follows compression passes;
  relaxation/restitution passes follow integration. Changing this ordering for a
  constrained body requires compatible response Jacobians, not only a better free
  rotation update.
- The existing ordinary-body `integrate_linearized` already uses a Cayley
  quaternion. The defect is not simply a missing Cayley formula.
- The existing angular speed cap uses the full outer timestep even when an island
  takes more substeps. Candidate admission must preserve that full-step policy;
  applying a full-step angle allowance independently to each substep is wrong.
- Gyroscopic parameters are per solver slot. Any candidate observations must be
  accumulated in independently claimed slots and reduced after the stage barrier;
  copying the restricted single-worker contact-counter writes would introduce a
  race on parallel islands.
- A first isolated-body experiment must explicitly exclude contacts, impulse
  joints, multibodies, soft/FEM bodies, locked angular axes, nonzero angular
  damping and external torque. Gravity alone does not invalidate free angular
  motion. Kinematic prescribed motion must retain its own path.
- Rejecting a candidate requires an explicit, observable engine policy. If a
  comparison uses the existing correction on rejection, it must use the original
  pre-cap velocity and original ordering. Correcting an already capped candidate
  is not an equivalent control.

These obligations are next work, not implemented solver behavior. The game remains
on published 0.13.0; no private candidate is installed or released.

## Native float-storage matrix

Thirteen tests pass after adding 1,500 independently sampled covariance-derived
inertias rounded through f32 at three scales. Of these, 1,240 pass the physical
admission check and 260 fail it after rounding. The admitted cases run 240 steps
each with attitude and angular velocity stored through f32 every step: 297,600
checked states. Maximum relative energy drift is 2.6857869635e-6 and complete
world-momentum-vector drift is 1.3438561422e-6. Measurements normalize stored
quaternions before interpreting attitude. `native-float-matrix.log` contains the
complete run. The rejected fraction is specific to this deliberately thin-body
sampling distribution, not an estimate of gameplay rejection frequency.

This establishes a concrete limitation before native integration: independent
float principal moments can cease to represent any physical mass distribution.
The admission boundary detects this rather than introducing a hidden correction.
A production choice needs either a physically consistent representation or an
explicit qualified policy for those cases. The matrix does not exercise contacts,
external torque, damping, native SIMD/parallel scheduling or actual engine state.
