# Bounded quadratic fluid-resistance channel

Candidate release: 0.19.0, not published. User requested deferred npm actions
until returning. Native kernel remains qualified 0.18.0; this adds a pure API
helper and does not change collision, integration or snapshots.

`solveQuadraticDragImpulse` solves one resistance channel `F = -k |v| v`, where
`v` is point velocity relative to the sampled fluid along an impulse direction.
It does not infer surface exposure, area, drag coefficients, flooding, added mass,
lift, buoyancy, or waves. Geometry and physical coefficients remain explicit.

## Derivation and energy ledger

For positive effective inverse mass `mInv`, backward Euler gives
`vNext + dt * k * mInv * |vNext| * vNext = v`.
With `a = dt * k * mInv * |v|`, the stable speed ratio is
`2 / (1 + sqrt(1 + 4a))`. The impulse follows from the velocity change divided by
`mInv`. Weak drag uses a rationalized fractional loss to avoid subtracting nearly
equal speeds; stiff drag retains a separate speed ratio. Nonrepresentable scales
and outputs are rejected rather than silently turning off resistance.

For a free rigid body at a fixed pose, the caller supplies
`mInv = nᵀ M⁻¹ n + (r × n)ᵀ I⁻¹ (r × n)`.
For articulated/constrained systems, use the complete coupled response instead;
the scalar helper cannot infer it. The integration fixes pose/mass during this
impulse. Applying it in a native Float32 engine requires independent verification.

If `j` is the signed impulse and `u` the fluid speed along the same direction:

- Relative work: `j * v + 0.5 * mInv * j²`, never positive.
- Reservoir work: `j * u`.
- Body work: relative work plus reservoir work.
- Dissipated energy: negative relative work.

A moving reservoir may add body energy legitimately; subtracting reservoir work
is essential before claiming dissipation. Consistent length-unit scaling changes
speed and impulse by `U`, resistance by `1/U`, and energy by `U²`.

## Evidence

Six targeted tests / 4,540 assertions cover weak/stiff scales and both directions,
the implicit residual, a Galilean boost, metre/centimetre scaling, analytic ODE
convergence, zero/invalid inputs, and actual off-centre native impulse/energy checks.
No default coefficient is silently selected. Complete package and browser/release
qualification are separate pending gates.

## Primary references and scope

[NASA's drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/)
relates drag to density, squared speed, reference area and a coefficient; its
coefficient must be interpreted together with the chosen area. This motivates
explicit inputs, not a universal coefficient for arbitrary wood or hulls.

[MuJoCo fluid forces](https://mujoco.readthedocs.io/en/stable/computation/fluid.html)
distinguishes approximate drag/viscous models from fluid simulation and recommends
implicit integration for velocity-dependent forces. Our scalar impulse and energy
ledger above are derived here; they are not MuJoCo's ellipsoid model or a copied
implementation. Both references checked 2026-10-31.

Next game experiment: exposed physical-union surface patches in a planar,
one-way reservoir, with submerged area from existing geometry queries. Record
relative-flow work, native energy changes and time/refinement convergence before
claiming a complete water-body coupling. Occluded/cavity surfaces, free-surface
slamming, added mass and wake interactions remain outside that experiment.

Complete package qualification passes **248 tests / 92,014 assertions**. The
GPU-disabled browser worker passes the new energy ledger and all existing
native/contact/snapshot checks. Independent archive/build verification is next;
publication remains deferred.

Independent API builds match all 50 distribution files. The embedded native WASM
is byte-for-byte identical to qualified 0.18.0 (SHA256
`67e366a5151fd865f6e6fb154a8cb27a7c4073c19e51e0e594633cf07f6e956e`).
The exact prepared archive and its file/native/provenance audit are saved here.
This is an additive pure-API candidate, not a new native integration algorithm.
No npm authentication or publishing has been initiated.

## Matrix ownership defect found by real surface integration

The first actual-tree pressure run rejected a negative effective inverse mass.
The inertia matrix returned by `SdpMatrix3Ops.fromBuffer` borrowed the shared native
scratch buffer: subsequent velocity queries overwrote its first three entries.
A regression fails on the prepared archive, while explicit caller-owned targets
already behave correctly. Default matrix results now allocate six owned elements
before copying. Both inverse inertia and inertia results remain unchanged across
other getters and independent returned matrices.

The previously saved 0.19 archive is superseded until this fix completes full
qualification and the archive/independent build are regenerated. Native kernel
bytes remain unchanged. This is an API ownership correction, not a weaker drag
input gate or a game-local workaround.

## Batched surface response

The fixed real-tree run exposed native Float32 accumulation error when each tiny
surface impulse was applied separately. `solveQuadraticDragPatches` now performs
up to 4,096 sequential frozen-pose channels in JS double precision and returns
one combined linear/angular impulse pair. It takes explicit world-frame offsets,
directions, fluid velocities, coefficients, one-sided policies and a free rigid
body's inverse response. It validates positive-semidefinite inverse inertia,
reports locked channels, and never changes caller storage. Native coupling to
articulations or contact constraints is outside this response model.

Tests check the scalar limit, full-tensor work identity, directional normalization,
locked/invalid inputs, and native application in metre/centimetre worlds. The first
448-patch branch comparison reduces 480 Hz ledger error from 2.28e-4 to 4.60e-7
of initial energy and reduces native impulse calls from about 253,545 to 1,920.
The measured wall time did not improve in this small run; the demonstrated gain
is precision and fewer native calls, not a hardware/performance claim. Spatial,
timestep and ordering qualification is still required.

The owned-matrix correction and batched patch API pass the complete **254-test /
92,063-assertion** package suite. The GPU-disabled browser worker passes both
scalar and batched energy ledgers, returned-matrix ownership, and all previous
native/contact/snapshot checks. A 27-case actual-tree rate/refinement/order
matrix is now running with frozen package outputs. The earlier archive remains
superseded until regeneration after this source checkpoint.
