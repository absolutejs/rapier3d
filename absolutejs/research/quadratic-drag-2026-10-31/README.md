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
