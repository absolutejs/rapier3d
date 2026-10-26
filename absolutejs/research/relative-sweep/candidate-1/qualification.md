# Candidate 1 — rejected for production

Relative target sweeps, symmetric full-CCD eligibility, conservative temporary
awake-target BVH, and simultaneous endpoint clamping fix the tested sphere crossings:
0 of 135 candidate cases vs 75 of 135 registry 0.3.0 cases; neither reports an
energy increase in this one-step sphere matrix. These are observations, not full
acceptance tests. Package tests: 12 pass, one upstream motion-parity failure.

The exact full-world chip/cavity checkpoint worsens from 4.0587% peak native-envelope
overlap to 16.1132%. Moving compounds use the nonlinear dispatcher in this candidate;
that path does not retain the existing composite sweep's per-piece overlap fallback.
This is a hypothesis for the regression, not yet a proven sole cause. Follow up with
moving child-proxy sweeps and conservative compound-BVH queries. Sensor/event,
kinematic, sleeping, rotational, soft-body and performance checks are still required.
The private research package cannot be published accidentally. No game dependency
or running solver was changed. Existing parity tests were not weakened.
