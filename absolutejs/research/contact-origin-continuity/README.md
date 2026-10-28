# Contact-origin continuity after 0.16.0

Baseline source is published 0.16.0, receipt/tag commit `f6e8244`, qualified
source `c19e57e`. This isolated research branch is explicitly private; canonical
game and the retained release checkout stay on the verified published engine.

The retained contact-origin harness in `../rigid-assembly/contact-origin.rs`
compares physically identical two-link fixed assemblies whose root modeling
origins differ. Both strike the same frictionless ground with the same masses,
shapes and initial physical state. The four cases use 60/240 Hz and 1/4 solver
substeps. The inherited proposed strict bounds are 0.0005 m for COM position
and 0.0005 m/s for linear velocity; contact must actually occur.

The 0.14.1 investigation exceeded the velocity bound in one case. First rerun
that unchanged fixture against 0.16.0 to determine whether the failure remains.
Do not assume that an older result describes the current engine, relax the
bound, or treat observation-only output as a passing strict test. If it still
fails, locate the first divergent contact step and separate collision geometry,
constraint response and time-integration effects before changing the solver.
No native physics source is changed in this initial checkpoint.

All tests are CPU-only, with two Cargo build jobs and a separate target
directory. Store source, failures and measurements here and push checkpoints.

## Current result

The unchanged strict fixture passes all four cases on 0.16.0. Maximum COM
position difference is 1.6296459e-5 m; maximum linear velocity difference is
8.631119e-5 m/s. Every case records active contacts (74–305 accumulated pair
observations). The prior 0.14.1 threshold failure therefore does not reproduce
on this source. No tolerance was relaxed and no native physics code changed.
This closes that specific retained reproduction, not general contact-rotation
accuracy. The independent 32-island snapshot ordering observation still needs
to be rerun and, if reproduced, decoded before attributing it to a collection.
