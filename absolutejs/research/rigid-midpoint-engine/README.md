# Private native matched-rotation experiment — 2026-10-28

This research branch wires the previously isolated midpoint/Cayley arithmetic
into actual native ordinary-body free-flight integration. It is **not released**,
not installed in the game, and does not fix coupled contact/joint rotation.
The game remains on published 0.13.0.

## Admission and integration

An island must have no contact graph, impulse joints, multibodies or soft/FEM
constraints. A candidate body must be dynamic, awake, gyroscopic, have no locked
angular axes, no angular damping and no external torque; fast-rotation mode is
excluded. Gravity is allowed. Candidate rejection checks physical stored moments,
bounded Newton success, actual Cayley angle and incoming/outgoing angular speed.
The angle allowance is scaled to the substep from the existing full-step cap.

The velocity-increment stage computes both the matched velocity and attitude.
Accepted bodies carry the pending attitude to COM-pose integration; the ordinary
linear update remains unchanged. No contact/joint response is adjusted under
this admission policy. On rejection, the original pre-cap velocity follows the
existing correction, cap and integration ordering. Rejection remains in force
for the rest of that island solve, and is re-evaluated at the next solve.

Per-slot observations count accepted, nonphysical-inertia, cap and other
numerical/invalid-input results, plus maximum Newton updates and residual in
radians/second. Reduction happens only after workers join. The private raw WASM
query returns an owned vector only after a completed profiled step, matching the
existing freshness convention. No stable public wrapper is claimed.

## Actual engine evidence

The initial serial and two-worker matrices cover 96 one-second free-body cases:
four moment tensors, three scales, 60/240 Hz, one/four substeps and two principal
frame orientations. There are 36,000 accepted substep updates and no rejections.
Compared with published 0.13.0 native source at
`65d37204d0e8e662389b77c5720e24c3a2108c57`:

| Maximum relative drift | 0.13.0 control | Candidate |
| --- | ---: | ---: |
| Angular energy | 0.03202786 | 0.000002590655 |
| Full world angular momentum | 0.04651590 | 0.000001308938 |

72 cases improve beyond 1e-8 in each metric; none worsen beyond that threshold.
This is a synthetic fixture matrix, not a game-wide energy or performance claim.
`compare.py` checks all 96 fixture identities and all 542 excluded/rejected
control states for exact position, attitude, linear-velocity and angular-velocity
bits. Modes cover gyro disabled, damping, torque, locked axes, fast rotation,
kinematics, contact, impulse joint, multibody, nonphysical moments and speed cap.

The first comparison found one speed-cap mismatch: later substeps could re-enter
the candidate after the first rejected substep. `control-matrix.log` retains that
initial result; `sticky-control-matrix.log` records the corrected policy. All
542 control states then match exactly. The comparison parser also accounts for
libtest placing the test name before the first output record; treating only
line-start records as data originally undercounted both matrices by one.

A 64-island matrix alternates damping eligibility and checks 7,680 body states
with profiling on/off: motion is bit-identical, accepted counts reset correctly,
and no stale pending attitude leaks across steps. Separate offset-COM fixtures
with gravity retain exact expected linear velocities, maximum COM position error
below 5e-7 m and angular invariant drift below 6.5e-7. Both serial and two-worker
runs pass; this does not qualify arbitrary constrained parallel scenes.

## Stored inverse-inertia audit

The earlier f32 storage matrix omitted one native conversion: Parry stores
inverse principal moments, and its getter reconstructs moments in Real. On the
same 1,500 deliberately thin input tensors, physicality failures are 260 at
input, 283 after actual f32 inverse storage/reconstruction and 364 if only that
last reciprocal is widened to f64. Admission differs for 119 inputs. Widening
alone is therefore not a representation repair. This is a constructed thin-body
sample, not a gameplay frequency estimate. The exact audit source/log lives in
`../rigid-midpoint-native`.

## Reproduction and remaining qualification

The candidate and baseline harnesses are separate standalone Cargo workspaces,
with the same test source, pinned lockfiles and durable two-job build targets.
The baseline path points to the unchanged published source checkout. Dependency
fetch for parallel tests added only Rayon and Crossbeam; the initial offline
failure and successful fetch are retained.

Use `CARGO_BUILD_JOBS=2`, the existing durable Cargo cache and explicit harness
manifest. Parallel tests use `RAYON_NUM_THREADS=2` and `--test-threads=1`.
The WebAssembly build and package regression work are separate from these native
CPU results. A release still requires qualified WASM/API identity, package and
browser tests, game controls, independent builds and published-version adoption.

## WebAssembly and trajectory follow-up

The optimized WebAssembly build completed in 5m39s with two jobs. The stable
identity guard correctly refused it before a research-only manifest was set.
The private API reports `unqualified-midpoint-research` and package
`0.13.0-midpoint-research.0`; `private: true` remains set. Native SHA256 is
`0923de1a2b4be66faf2a17e602c566b227457cd511ef4ea6bab799c9d227af6c`
(3,307,201 bytes). No stable release identity is reused.

All 189 existing package tests pass (77,522 assertions). Three separate WASM
observation tests pass (259 assertions), including owned storage, freshness,
restoration, rejection retained across substeps and exact snapshot bytes with
profiling on/off during changing eligibility. The bounded Chromium worker check
passes with `--disable-gpu`.

The actual-engine trajectory test compares 12 cases at 60/120/240 Hz with the
independently refined RK4 fixtures. Its first version incorrectly required a
fourfold observed error decrease even below the f32 roundoff floor: a 9.89e-7 rad
error became 4.41e-7 rather than one quarter. That failure is preserved in
`native-trajectory-roundoff-floor.log`. The corrected test separates the two
questions: the f64 midpoint trajectory retains second-order convergence toward
RK4, and each native attitude remains within 2e-6 radians of that matching f64
trajectory. All five native tests pass in serial and two-worker builds. The
largest coarse-step error to RK4 is 0.01181999 rad; the 2e-6 bound is specifically
native-versus-matched-midpoint, not native-versus-exact-flow.

## CPU cost

`benchmark-wasm.ts` runs 12 alternating pairs after three warmup pairs, with 32
free bodies, 120 steps per batch and four substeps. Baseline median is 6.494 ms
per batch; candidate median is 17.821 ms. Median paired ratio is 2.91 and paired
additional cost is 0.699 microseconds per body/substep. These are CPU Bun/WASM
results, not browser FPS or a guarantee for other machines/scenes. No heavy build
or test ran concurrently with this measurement. The baseline is the installed
published 0.13.0 game package; both module hashes and identities are recorded.
This cost must remain visible when choosing active-body simulation budgets.

## Release-candidate SDK preparation

The 0.14.0 candidate adds named owned `world.freeRotationStats()` observations
and deep-owned `native.freeRotation` records in the existing bounded profiler.
All 193 package tests pass (77,586 assertions), including sampler ownership,
freshness, eligibility changes and exact snapshot parity. Strict declaration
checks pass. The GPU-disabled browser verifies the named records and their
ownership as part of its existing actual-worker regression.

A final source/documentation rebuild takes 3m44s and produces exactly the same
3,307,201 native bytes as the private archive that passed all 840 game tests.
The public statistics integration changes API code, not that native kernel.
Source manifests and both build identities are retained. Independent source
reproduction and final archive qualification remain required before publishing.
