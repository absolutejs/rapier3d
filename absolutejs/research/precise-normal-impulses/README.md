# Private precise adaptive normal-impulse accumulation

Preserve parent 148d532 at .absolutejs/adaptive-normal-compression-dist. The captured 160-unit normal impulse cannot store its requested 7e-6 correction in f32, explaining a residual that extra sweeps do not resolve.

Within the existing restricted adaptive compression and rebound phases, accumulate current normal impulse in f64 and calculate its increment before narrowing to native Real for application. Keep normal-part warmstart values in their existing representation, initialized into the precise accumulator at each phase start. Clear the precise-mode flag after the phase and on constraint generation. No persistent manifold/snapshot schema or public API change, energy clamp, force scaling or relaxation of test gates. Other solve paths retain their existing operation sequence.

Expand strict unequal-mass regression to one and four substeps. Require full snapshot parity/replay, zero-restitution controls outside the changed frictionless path, friction/compliance comparisons and CPU cost measurement before qualification.

Native SHA256 269ca9e983d91f0b2536d91872249fb94d83ea4818fa47009230035dda0a4311, 3,304,354 bytes. All 165 package tests pass, 76,909 assertions, including the strict single-substep unequal-mass regression. Across 486 native mass-ratio runs, maximum final energy error is below 0.000132 J and maximum added energy below 0.000052 J; the prior 0.001297 J scalar stall is removed without changing its gate. Full game-runtime qualification and further boundary/cost controls are ongoing. This remains private; do not publish or update the game dependency.
