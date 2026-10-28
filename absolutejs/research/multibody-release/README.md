# Multibody writeback release qualification

Candidate 0.8.1 refreshes linked rigid-body velocities after the final solver update and derives final COM lever arms from integrated link transforms. It preserves the original restitution algorithm, sweep count and contact defaults. Native source matches research/multibody-writeback at 14f9e49. The private candidate passes 39 package tests plus the separately added revolute-joint test; fixed assemblies, rotations, offsets, timesteps, scales and insertion orders are covered. Full game qualification is running separately; independent native reproduction, browser and packaging checks are still pending.

Scope: current articulated velocity consistency. The 48-case comparison leaves compound-body controls unchanged, improves maximum articulation momentum-reporting error from 20.000003 to 0.060015 kg m/s, and reduces fixed-link rigid velocity residual from 0.015683 to 2.8e-7 m/s. Off-center integration is not conservative: maximum energy gain is 0.276682 J from 40 J (stable 0.275773 J), angular momentum error is 0.201618 (stable 0.201381). These limits remain explicit; do not describe this patch as a conservation fix or adopt the rejected global-sweep experiments.

The candidate manifest remains private until qualification and the scoped release decision are complete. No game dependency has been changed.
