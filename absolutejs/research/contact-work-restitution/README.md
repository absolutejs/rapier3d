# Private contact-local normal-work restitution experiment

Parent is the current-pose response refresh e88a852. Preserve its dist under .absolutejs/contact-response-refresh-dist. The game remains on published 0.9.0.

Track each generic contact point's signed normal impulse work across warmstarts, biased solves and stabilization, with f64 accumulation. Track the maximum absorbed work, including a quadratic impulse interval's interior minimum. The ledger is reset when constraints are generated; no persistent world snapshot schema or public API is changed. Tangential work is not credited as recoverable normal compression.

At delayed restitution, preserve existing seed/positive-impulse activation. Derive a current-velocity target from available normal rebound work: e² times peak compression minus work already returned. Include compression still required if the contact remains approaching. Solve through the refreshed Jacobian/mass response. This is a contact-law experiment, not a global measured-kinetic-energy clamp.

Qualification must test both gain and excessive loss, normal-work accounting under solver undo/warmstart, coupled contacts, friction, damping, external/kinematic work and speculative activation. Same-articulation cross terms and augmented-versus-physical mass remain known concerns. Do not publish based only on isolated elastic contacts.

Added 24 analytic equal-mass head-on gates covering restitution 0/.5/1, 60/240 Hz, 1/4 iterations and touching/separated starts. They pass against the saved response-refresh baseline before this build, so new failures are regressions rather than new tolerances applied only to the candidate.

## Rejected qualification result

Do not publish this kernel. The 69 package tests pass, but coupled simultaneous impacts turn 80 J into 148.4469502 J. Independent scalar reconstruction predicts 16 native frames within 0.000390 J and 0.00002312 m/s. Sequential contact-work ledgers credit energy transferred through a shared body as independently refundable compression. The game remains on published 0.9.0.

The Hello World repository retains 144 isolated/friction comparisons, 48 coupled runs, 104 exact snapshot replays, source/input hashes and the independent reduction under docs/contact-work-restitution-2026-10-28. A separate restricted 2x2 coupled-impact oracle validates 324 mass/velocity/restitution fixtures under row permutation, Galilean boosts and reflection. It is a future solver gate, not a qualified replacement. Preserve the response-refresh parent independently from this rejected law.

Built private WASM SHA256: b13a15a7eceb18ae70bb4c067ad2c8e2df2080a675f0df619dc7df983af57091. Build logs and 69-test result are retained here.
