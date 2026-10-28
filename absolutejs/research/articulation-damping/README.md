# Explicit articulation damping controls

Private additive API candidate based on published 0.8.1. No contact, integration, or default damping policy is changed. Native `MultibodyJoint::default_damping` sets free angular DOFs to 0.1, including a floating root. This is distinct from rigid-body damping and is not scaled by lengthUnit. The existing JavaScript API cannot inspect or change it.

Expose owned generalized-damping copies and transactional setters on MultibodyJointSet, addressing the whole articulation selected by a live joint handle. Reject nonfinite/negative values, wrong vector lengths, and stale handles. Callers explicitly wake bodies and must re-read after topology changes. Native validation is retained even when callers bypass the TypeScript wrapper.

Purpose: qualify genuinely undamped integration controls before altering native integration. Previous body-damping-zero fixtures still have default generalized angular damping; those records must not be described as torque-free evidence.

## Candidate checks

Native wrapper build SHA256 `f4e4606942e43e6af0ed2bed313005f9f4b89b0f716f569818e81742f77926ae`, 3,294,044 bytes. The stable hash guard rejected it as expected; the explicit private manifest then allowed API packaging. Native solver source under `src/` is unchanged from published 0.8.1.

All 45 package tests pass (57,649 assertions), including ownership, native-bypass validation, snapshot parity, topology and measured angular decay. The GPU-disabled browser worker passes the damping controls and all existing physics checks. The game probe's 32 default-policy cases exactly equal published 0.8.1 results. All 32 zero-policy cases verify generalized damping remains zero after each step; the hidden damping explains unit-dependent decay but does not remove the remaining integration drift.

Independent game-side planar root-Euler predictions explain all eight captured undamped failures within 1.28e-6 kg m/s momentum and 1.25e-7 m COM position. This API exposes a missing experimental control; it is not an integration correction. Independent native-build and release qualification are still pending.
