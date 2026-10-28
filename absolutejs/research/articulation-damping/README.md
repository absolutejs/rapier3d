# Explicit articulation damping controls

Private additive API candidate based on published 0.8.1. No contact, integration, or default damping policy is changed. Native `MultibodyJoint::default_damping` sets free angular DOFs to 0.1, including a floating root. This is distinct from rigid-body damping and is not scaled by lengthUnit. The existing JavaScript API cannot inspect or change it.

Expose owned generalized-damping copies and transactional setters on MultibodyJointSet, addressing the whole articulation selected by a live joint handle. Reject nonfinite/negative values, wrong vector lengths, and stale handles. Callers explicitly wake bodies and must re-read after topology changes. Native validation is retained even when callers bypass the TypeScript wrapper.

Purpose: qualify genuinely undamped integration controls before altering native integration. Previous body-damping-zero fixtures still have default generalized angular damping; those records must not be described as torque-free evidence.
