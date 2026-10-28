# Native inertia reconstruction qualification — 2026-10-28

Private candidate, based on published Rapier 0.12.0. Not installed in the game.
The only intended native behavior change is the pinned Parry mass-property
reconstruction correction at c566aabd77be8ac7a427c2b704860c47e34657b9.

Source and native regression evidence:
https://github.com/absolutejs/parry/tree/c566aab/research/inertia-reconstruction

The independently measured mass-property bug changes a small rotated compound
object's inertia tensor by up to 53% in the captured diagnostic. The correction
normalizes the tensor and uses bounded Jacobi rotations with double-precision
workspace, retaining f32/f64 public types and nonnegative principal moments.
It passes 2,688 scale/orientation/aggregation controls in the canonical library,
the prior simplex witness regression tests, and no-std compilation.

The new package tests reproduce large errors against installed 0.12.0; see
`installed-baseline-tests.log`. A separate browser-worker check reconstructs a
small two-sphere tensor from actual reported principal inertia and frame.

The first locked fetch correctly rejected a mixed source configuration: the
bindings' direct Parry dependency had not yet been updated alongside the engine.
All three source pins and the bindings lock now point to the same revision.
The intermediate lock update belongs only to a discarded generated workspace;
no unrelated dependency updates were applied to the canonical lock.

The native build retains Rust/Cargo 1.94.0, Bun 1.4.4+absolute.1, two compilation
jobs, an isolated target and offline cached dependencies. Stable native identity
must reject the changed bytes until this candidate is explicitly identified and
qualified. Do not copy its artifact into installed dependencies.

Pending: package suite, browser checks, direct compound fixture, independent
native rebuild, archive audit, stable source promotion and publication/adoption.
This correction does not fix free rigid-body angular integration or articulated
COM transport. Those investigations remain separately documented.

## Primary build qualification

Private native bytes: SHA256
`a6f06627b5b95ff15b87fbe45bf8dfd19eeb78b4f949a912e3fed5805fbcc62b`,
3,298,974 bytes. The stable-identity guard rejected them as expected before
private labeling. The first native compilation succeeded; the subsequent bindgen
installer hit restricted network access. Reusing its existing checksum-pinned
archive completed packaging. No native rebuild was needed for that retry.

All 189 package tests / 77,522 assertions pass with the private candidate.
Declaration contracts and GPU-disabled Chromium worker checks pass, including
an actual small compound tensor reconstruction and previous contact controls.
Sixteen saved assembly snapshots additionally exercise ordinary collider mass
aggregation: maximum relative tensor error falls from 9.9419e-5 to 2.7071e-7.
The reproduction uses the committed rigid-reference research files at 5187717
in the sibling `rapier-rigid-reference` worktree and records their hashes.

Twenty alternating CPU benchmark pairs after four warmups measure only 2,000
three-collider mass recomputations per sample. Median baseline: 2.41809 ms;
candidate: 3.964493 ms, roughly 0.773 microseconds extra per recomputation in
this workload. This is a correctness/cost tradeoff at geometry updates, not FPS
or a universal setup-cost claim. No heavy compilation ran during measurement.

Prepared release metadata is 0.13.0 while package.json remains private until
independent build qualification. Publication, archive and game adoption are
still pending. The native fix does not resolve angular integration drift.
