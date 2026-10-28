# Next experiment: free fixed-assembly transport

This is a derivation and qualification plan, not an implemented solver or a
claim that the current root-origin correction fixes aggregate dynamics.

For an all-fixed floating articulation, collect each positive-mass link's
mass properties using authored root-relative transforms. Let `c_i` be its COM
in root coordinates, `J_i` its inertia about that COM rotated into root axes,
`M = sum m_i`, and `C = sum(m_i c_i) / M`. The aggregate inertia is

`J = sum[J_i + m_i ((d_i dot d_i) I - d_i d_i^T)]`, `d_i = c_i - C`.

Compute these from relative joint transforms, not large translated world
positions. Verify the reconstructed tensor against an independent double
precision sum. Existing stored inverse-moment round trips and physicality
admission must remain visible; do not silently repair a nonphysical tensor.

With root attitude `Q`, root origin `x`, root local COM `c_r`, generalized root
COM velocity `v_r`, and world angular velocity `w`, the aggregate state is

- `X = x + Q C`
- `V = v_r + w cross Q(C - c_r)`
- `L = Q J Q^T w`.

For force-free motion, preserve the input `V` and advance `X_new = X + h V`.
Use a matched angular-velocity/attitude update for the aggregate, giving
`Q_new, w_new`, then reconstruct

- `x_new = X_new - Q_new C`
- `v_r_new = V + w_new cross Q_new(c_r - C)`.

This preserves the representation as separate connected bodies. It must update
both generalized solver storage and link/body velocities coherently; rewriting
only final public velocities is insufficient. The current native Coriolis and
gyroscopic velocity increment must not be applied before and again inside this
step. Recovering a previous velocity by subtracting rounded increments is not a
substitute for retaining the actual incoming state.

Start with an explicit force-free, floating, all-fixed, positive-mass domain,
with no contacts/external joints, locks, damping, armature, friction, springs or
couplings. Audit all excluded paths for exact preservation. Uniform gravity and
loaded/contact states need separate derivations and controls, not inferred
admission from a small measured net torque. Root ordering, nonzero local COMs,
principal-axis frames, unit scaling, snapshots and parallel slot reuse belong
in the initial matrix. Conservation and independently refined trajectory
agreement are separate requirements. Do not merge the older root-transport
experiments wholesale: their remaining angular and work defects are recorded.
