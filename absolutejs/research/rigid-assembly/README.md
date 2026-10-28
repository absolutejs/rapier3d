# Floating-root coordinate investigation — 2026-10-28

Private source experiment based on published Rapier 0.14.0 (`ee652f0`).
The game remains on the published package. This experiment does not implement
aggregate rigid-assembly free rotation or repair contact work/energy drift.

## Root origin is not its center of mass

The free-root Jacobian and `update_velocities_with_com_source` identify its
linear generalized velocity with the root body's COM velocity. The free joint's
translation coordinates instead locate the body origin. Previously `integrate`
advanced those coordinates directly by COM velocity while rotating a nonzero
local COM about the origin. Moving an authored origin therefore changed physical
motion even with unchanged mass distribution, joint placement and velocities.

For root local COM `c`, attitude `R` and origin `x`, the physical COM is
`x + R c`. Keeping the chosen rotation integrator, the correct origin update is
`x_new = x + dt v_COM + R_old c - R_new c`.
This is a coordinate correction, not a momentum/energy clamp. Fixed roots and
zero-offset roots retain their existing arithmetic. Joint displacements used
outside time integration are unchanged and need their own semantic audit.

`origin-baseline.log` records six one-second physically equivalent fixed-assembly
pairs with changed root origins: maximum COM separation 1.6234083 m, despite
near-identical angular velocities. The candidate reduces this below 7.72e-7 m.
The 48-case extended matrix covers 60/240 Hz, 1/4 solver substeps, scales
0.01/1/100, identity/tilted initial frames and zero/uniform gravity. Maximum
position difference divided by scale is 3.7811074e-6; maximum linear-velocity
difference divided by scale is 2.927462e-6. Both link COMs/velocities are compared.
These comparisons establish coordinate covariance, not physical conservation.

The five previous ordinary-body tests pass. All 542 excluded/rejected control
states still match their original baseline exactly; see `free-controls-comparison.json`.
Subsequent qualification adds 16 movable hinge/prismatic joint cases, all passing.
The WASM package passes 195 tests (85,181 assertions), including eight origin
covariance cases (maximum 1.42523e-6) and 120 exact snapshot replay steps.
Strict declaration checks pass. GPU-disabled Chromium worker checks pass with
maximum origin error 7.86945e-7 m. The native build guard correctly rejected
unqualified bytes before explicitly marking this manifest private/research.
Native WASM SHA-256 is
`4686ddcbc3804f6692e67a93a0a99eb54ea92babc4ad293a54010ef54b7c9ec5`
(3,307,856 bytes). An independent checkout/target build matches all 49
shipped distribution files and packaged native bytes exactly. Raw compiler
intermediates differ only in the `__wasm_bindgen_unstable` custom metadata;
all executable/data sections match. The audit records both raw hashes and no
source-input differences. Do not describe the raw intermediate files as equal.

The game records an 80-case comparison in `docs/root-origin-2026-10-28`.
Only eight local-COM articulation cases change; 72 other physical rows are exact.
The largest articulation angular-momentum error drops from 0.5974573 to
0.08135878, and COM position error from 0.11963865 m to 0.01168200 m.
Linear-momentum and energy maxima are unchanged; residual drift remains.
All 32 captured snapshot pairs have verified hashes, restoration and exact replay.
No 2D qualification or gameplay visual/performance claim is made.

## Reproduction and retained failures

Use `CARGO_HOME=/home/alexkahn/alex/hello-world/.cache/physics/cargo`,
`CARGO_NET_OFFLINE=true`, `CARGO_BUILD_JOBS=2` and a checkout-local
`CARGO_TARGET_DIR=$PWD/.cache/engine-target`. Run Cargo test with manifest
`absolutejs/research/rigid-midpoint-engine/Cargo.toml`, test
`assembly_coordinates` or `free_rotation`, and `-- --nocapture --test-threads=1`.

The initial harness compile failures incorrectly dereferenced by-value velocity
getters. Those logs remain alongside the corrected runs. A clean worktree also
revealed that the earlier RK4 CSV fixture was excluded by the repository-wide
CSV ignore rule. The recovered 3 KiB fixture matches the previously committed
SHA-256 receipt exactly and is now explicitly tracked. The source generator and
reference-source hashes remain available; no test results were fabricated to
replace missing input.

## Release preparation

Version 0.14.1 is published; the registry SHA1/SHA512 match the audited archive. Eight native tests
pass with two Rayon workers, including all origin cases and the previous five
rotation/control tests. The full isolated game suite passes 841 tests and
7,408,721 assertions; app and physics-tool types and dependency resolution pass.
That run uses the preserved private archive in the game qualification branch
`research/root-origin-qualification` at `3b39252`.

The public archive audit checks all 53 files and embedded native bytes.
`release-equivalence.json` proves its runtime differs from the game-qualified
archive only in package/release identity strings; the manifest's private flag
is removed and two README files document the fix. Four final identity/origin
tests pass with 7,612 assertions. No fresh full suite on registry installation
is claimed. Final native code/dependency inputs exactly match the independent
build inputs; only README content differs, as recorded by the source audit.

The independently rebuilt packaged engine is byte-identical. Raw compiler
intermediate metadata differs, as explained above; do not collapse that
distinction in release claims. The canonical game stays on registry 0.14.0 until
publication, installed-file verification and adoption checks complete.

## Supplementary post-publication contact investigation

While npm processed the release, a new ground-contact covariance experiment
found one case above a proposed strict 0.0005 m/s velocity tolerance. The
60/240 Hz, 1/4-substep matrix improves every position and velocity error versus
0.14.0: baseline position errors exceed 1.12 m and velocity errors 3.77 m/s;
0.14.1 maxima are 1.46726e-5 m and 6.43732e-4 m/s. The remaining strict-bound
failure is preserved, not declared fixed. Its cause needs further investigation.

This supplementary research is separate from the 195 passing package tests and
841 passing game tests. `contact-origin.rs` preserves the complete fixture;
`contact-candidate/Cargo.toml` runs it against this source and
`contact-baseline/Cargo.toml` points to the retained 0.14.0 source checkout.
Filter Cargo tests with `contacting` to reproduce. The strict candidate run
intentionally fails; `ORIGIN_OBSERVE_ONLY=1` collects all four finite/contact
observations without claiming the strict bound passes. Logs preserve the
initial method/field compile mistake, strict failure, standalone reproduction
and both full observation matrices. `contact-comparison.json` checks per-case
improvement and identifies the unsatisfied bound. No release runtime code was
changed after the qualified archive was built.
