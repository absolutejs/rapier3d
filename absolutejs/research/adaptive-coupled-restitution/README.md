# Private bounded generic restitution convergence

Parent fixed-16 sweep candidate 0f1eb20 is preserved at .absolutejs/coupled-restitution-sweeps-dist. In single-worker worlds containing generic contacts and no ordinary contact chunks, perform at most 256 late restitution sweeps, stopping when the complete generic set has projected velocity residual <= 1e-5 * length_unit. Use the existing seed, impulse activation, target law and unilateral impulse bound; do not add work accounting. Geometry and mass are fixed throughout this stage, so refresh its response once. Mixed ordinary/generic paths retain 16 sweeps; ordinary-only paths retain one. No claim of general parallel or mixed-contact convergence.

The limit/tolerance are research controls, not published settings. Reaching the cap is not a convergence guarantee. Compression still uses explicitly configured PGS iterations. The game remains on 0.9.0.
