# Dynamic sphere/box conservation controls, in progress

`dynamic-pair-probe.ts` replaces the prescribed support with a reacting dynamic
box. Both centered shapes have finite mass; gravity, friction, restitution and
CCD are disabled. The probe measures exact box/sphere separation, fresh native
contacts, linear momentum, angular momentum about the initial center of mass,
and kinetic energy in the common-translation frame. Analytic shape inertias use
the measured native masses. No result here establishes physical acceptance.

There are 48 configurations per face/edge/corner matrix: short boxes use angular
speeds 0, ±6 and ±30rad/s; long boxes omit ±30rad/s to avoid excessive tip speeds.
Both insertion orders and 60/240/960Hz are covered with 32 solver subdivisions.
Every frame records proximity to existing speed caps. `--separated` moves the
sphere 50 units away and requires no fresh nearby contacts. `--boost` applies a
common translation; `--oracle` activates only explicit private research tags.

Before the dynamic-tag implementation, tagged and untagged face trajectories are
identical on the archived candidate-20 engine. All three baseline feature
matrices and the separated control complete. The native source change permits
the existing tagged geometry experiment to act on a dynamic box; it does not
change untagged contacts or make the shape-specific experiment production-ready.

The separated control exposes an independent integration issue: the long box at
960Hz starts at angular velocity `(0,0,6)` and reaches approximately
`(0,0,6.0028152466)` after 0.1s with no external force or nearby contact. Its
measured angular momentum increases by about 1.50147 and kinetic energy by
9.01096 in the probe's mass/length units (about 0.094% of initial energy).
Thus contact conservation must be compared against a free-motion baseline.
Source inspection identifies repeated principal-inertia/rotation round trips in
`gyroscopic_corrected_angvel` as a hypothesis to test separately. No gyroscopic
change is included in the dynamic-contact candidate.

Canonical source and selected evidence are stored here and committed. Generated
candidate engines remain under `.absolutejs/`; explicit engine hashes in every
probe output distinguish them. This branch is private and must not be published.
