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

Next: improve conditioning across thin-body inertia ratios, qualify bounded
nonlinear failures and native float conversions, then investigate integration
ordering. The current contact solver solves velocities, integrates positions and
performs later constraint passes using prepared responses. Inserting a free
rotation update into that flow without compatible contact/joint response handling
would not establish coupled conservation. No production integration or full-game
claim is made by these arithmetic tests.
