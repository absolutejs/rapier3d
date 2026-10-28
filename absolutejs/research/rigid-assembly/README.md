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
No WASM, browser, game, constrained movable-joint or 2D qualification yet.

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
