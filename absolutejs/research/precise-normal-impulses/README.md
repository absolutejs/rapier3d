# Private precise adaptive normal-impulse accumulation

Preserve parent 148d532 at .absolutejs/adaptive-normal-compression-dist. The captured 160-unit normal impulse cannot store its requested 7e-6 correction in f32, explaining a residual that extra sweeps do not resolve.

Within the existing restricted adaptive compression and rebound phases, accumulate current normal impulse in f64 and calculate its increment before narrowing to native Real for application. Keep normal-part warmstart values in their existing representation, initialized into the precise accumulator at each phase start. Clear the precise-mode flag after the phase and on constraint generation. No persistent manifold/snapshot schema or public API change, energy clamp, force scaling or relaxation of test gates. Other solve paths retain their existing operation sequence.

Expand strict unequal-mass regression to one and four substeps. Require full snapshot parity/replay, zero-restitution controls outside the changed frictionless path, friction/compliance comparisons and CPU cost measurement before qualification.
