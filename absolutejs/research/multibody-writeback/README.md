# Private multibody velocity writeback investigation

Based on published 0.8.0, independently of experimental restitution convergence changes. A stationary fixed articulation struck by an equally massive body reaches the correct final velocities, but body-reported momentum during impact disagrees with the isolated-system oracle. The final solver stage copies generalized velocities after restitution without refreshing linked rigid-body velocities. This experiment adds that refresh using the existing native update method. It changes no sweep count, contact law, or native initialization policy.

The parent research branch `research/dynamic-impact` at cfc484e preserves exact stable before/after snapshots and replay receipts. This checkout is private. It requires independent analytic controls, rotated/off-center geometry checks, snapshot behavior, broad tests and cost qualification before any release decision. In particular, final-pose COM transforms during angular motion must be checked; a passing collinear test is insufficient.

The new regression samples momentum after every solver step across 36 configurations (three world orientations, three timesteps, two length-unit scales, both insertion orders). It fails the published engine at the first collinear impact with about 9.98 kg m/s error. The game-side `probe-articulated-impact.ts` additionally compares 48 compound/articulation cases including off-center contacts and full principal-inertia energy. Baseline compound linear momentum error is below 3.3e-6 kg m/s, while articulation body-reported error reaches 20.000003 kg m/s. Baseline angular drift remains a separate integration limitation; do not claim this writeback change fixes it without comparison.

The helper added at final solver writeback runs on worker 0 after the barrier that ends all rigid-body writes. It uses the existing multibody-to-link velocity update and does not re-integrate positions or reapply impulses. The game currently has no runtime `createMultibodyJoint`/`createImpulseJoint` calls; this is reusable assembly infrastructure, not a claim of a new visible tree or water effect. Its value must be established by package qualification before future mechanism adoption.


## First writeback candidate

Native 555c1056a3f6932e3638d42dd708ed5a439ae08934d870318f6e0fbd9a1a0672 passes the 36 collinear/orientation configurations (3,888 assertions). The 48-case comparison leaves all compound metrics unchanged and reduces articulation momentum error from 20.000003 to 0.035213 kg m/s. Off-center rigid velocity consistency still fails by up to 0.015683 m/s. Source review identifies cached world COMs from before the final substep in `update_velocities`; link transforms already represent the final integrated geometry. Preserve this candidate, then test a final-writeback-only COM calculation from those link transforms. Ordinary internal substep updates must retain their existing semantics.

## Final COM candidate

Native `3a9f1a21f01b4868952cd997cf9b47d83f3e4fdd714d42f43b3cdd57912d6303` (3,293,062 bytes, source 14f9e49) passes both initial regressions (8,952 assertions), the 39-test package suite (57,302 assertions), and an added revolute-joint tangent-velocity test (all three focused tests: 9,256 assertions). The 48-case audit leaves compound controls unchanged and reduces fixed-link velocity inconsistency to 2.8e-7 m/s. Articulation momentum reporting improves from 20.000003 to 0.060015 kg m/s. Off-center energy gain remains 0.276682 J from 40 J versus stable 0.275773 J, and angular momentum drift 0.201618 versus 0.201381. The scope is accurate final link velocities, not exact conservation. The native restitution law and sweep count are unchanged from 0.8.0.

An isolated game suite is running. Canonical private release branch `release/multibody-0.8.1` prepares independent native reproduction after that suite completes. No public game dependency changes occur before publication and installed-archive verification.


The candidate passes all 828 isolated game tests (7,408,613 assertions), unchanged input hash, both game type checks, all sixteen stable snapshot replays, and the GPU-disabled browser worker. Browser maximum collinear momentum error is zero and rotating rigid velocity residual is 1.18e-7 m/s. The first browser attempt was blocked by sandbox loopback-listen permissions; the approved CPU-only run succeeds. Research-tool type checking passes.

Sequential CPU medians for 2/4/8/16 links are baseline 0.378/0.341/0.428/0.449 ms versus candidate 0.393/0.291/0.435/0.425 ms. Samples alternate engines on identical captured snapshots with restoration excluded. Tail timings are noisy; these observations do not establish an FPS improvement or general performance guarantee. Raw timings and immutable input hashes are retained. Canonical independent native reproduction is now running.


Canonical release 0.8.1 is committed/tagged at 8aa7e21 and npm accepted publication. This research checkout remains `private:true`; its version/identity and generated documentation are aligned solely for the independent distribution comparison. All 48 distribution files and packaged native bytes match the canonical release. The raw compiler intermediates differ only in wasm-bindgen custom metadata, not executable or data sections. The public game still needs registry/archive verification and adoption.
