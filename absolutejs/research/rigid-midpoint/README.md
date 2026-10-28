# Independent rigid-motion reference — 2026-10-28

Private research based on published Rapier 0.12.0. Nothing here replaces the game
solver, changes native integration, or qualifies a package release.

## Verified reference

`reference.ts` implements a double-precision body-momentum implicit midpoint solve
and the matching Cayley attitude update. For constant positive-definite inertia I,
m = (j0 + j1)/2 and omega = inverse(I) m:

- j1 - j0 = h (m cross omega).
- q1 = q0 * normalize([h omega/2, 1]).

The first relation makes the kinetic-energy difference omega dot (j1-j0) zero.
It also implies j1 = Cayley(-h [omega]x) j0, so the matching attitude update
preserves the **world-space vector** R j, not only its length. These are discrete
equations of motion; no measured invariant is clamped after integration. Newton
uses an analytic 3x3 Jacobian, bounded iterations and explicit failure. Floating
point and solve tolerance still limit conservation. The timestep still introduces
phase error.

Five tests / 18 assertions pass: nonprincipal full-tensor rotation, time reversal,
principal and zero spin, invalid inertia and exhausted solve, plus second-order
trajectory convergence against two independently refined classical RK4 solutions.
The RK4 comparison is important: conserving invariants alone does not establish
that a trajectory is correct. Strict TypeScript checking passes for the reference,
RK4 implementation and tests.

Primary sources consulted:

- [FEBio rigid-body theory](https://febiosoftware.github.io/febio-docs/theory/chapter6/6.3-rigid-body-dynamics/): rotation transforms, momentum balance and compatible midpoint/Cayley discretization. Our small torque-free reference and derivation above are not FEBio's full constrained solver.
- [Buss, Accurate and efficient simulations of rigid body rotations](https://mathweb.ucsd.edu/~sbuss/ResearchWeb/accuraterotation/index.html): author's abstract identifies conservation and trajectory accuracy as separate numerical objectives; we have not adopted the paper's integrators.

## Native reproduction

`compare-native.ts` runs published 0.12.0 for one second with three separated
spheres connected by fixed multibody joints. Unequal masses and nonprincipal spin
exercise coupled translation and rotation. The 16 cases cross 1/100 length units,
60/240 Hz, 1/4 substeps and reversed root/insertion order.

The initial articulation velocity requires a load bootstrap: body descriptor
velocities do not initialize its generalized velocity. The first, invalid setup
and output are preserved as `compare-native-direct-velocity-invalid.*` and **must
not be used as evidence of a free-motion defect**. The corrected test clears all
loads after bootstrap and measures its actual initial state.

Every corrected run checks zero body/generalized damping, zero user loads, and
zero solver contacts after bootstrap and every step. Initial angular velocities
agree exactly; the largest rigid linear velocity-field residual is 2.025e-7 m/s.
There are 2,416 checked states and 2,400 byte-identical snapshot replay steps.
Sixteen initial snapshots (135,616 bytes total) and their SHA-256 values are saved.
Source/API hashes are checked both before and after measurement.

Across these deliberately energetic fixtures, maximum deviations from each actual
initial state over one second are:

| Quantity | Published native | Independent reference |
| --- | ---: | ---: |
| Linear momentum (kg m/s) | 1.8012611565 | Translation is analytic, not a tested native replacement |
| Spin angular momentum about COM (kg m²/s) | 0.1576629494 | 3.765e-12 |
| Kinetic energy (J) | 1.1035823889 | 1.782e-12 rotational energy |

`native-comparison.json` contains each case, actual bootstrap state, COM drift,
orientation discrepancy and controls. Root-order cases are **not identical initial
physical states** after load bootstrap; do not interpret their differences as a
controlled root-invariance experiment. Increasing substeps reduces native error;
this does not establish an acceptable game setting or a performance result.

## Reproduce

From the repository root, using Bun 1.4.4+absolute.1:

```sh
bun test ./absolutejs/research/rigid-midpoint/reference.test.ts
bun absolutejs/research/rigid-midpoint/compare-native.ts
```

The default engine is the installed, published package in `../hello-world`.
`RIGID_REFERENCE_ENGINE` can select an explicit API path; output records its hash
and buildInfo. All runs are CPU-only. No production dependency patch is installed.

## Remaining qualification

Compare the same measured initial state against an equivalent compound rigid body.
Then derive a consistent native update with COM transport and angular integration.
External forces, articulated joints, damping, contacts, changing topology, response
Jacobians and work balance all need separate qualification; a torque-free reference
is not sufficient to replace those paths. Preserve the canonical stable engine
until the candidate has passed those checks.
