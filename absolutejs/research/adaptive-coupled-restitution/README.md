# Private bounded generic restitution convergence

Parent fixed-16 sweep candidate 0f1eb20 is preserved at .absolutejs/coupled-restitution-sweeps-dist. In single-worker worlds containing generic contacts and no ordinary contact chunks, perform at most 256 late restitution sweeps, stopping when the complete generic set has projected velocity residual <= 1e-5 * length_unit. Use the existing seed, impulse activation, target law and unilateral impulse bound; do not add work accounting. Geometry and mass are fixed throughout this stage, so refresh its response once. Mixed ordinary/generic paths retain 16 sweeps; ordinary-only paths retain one. No claim of general parallel or mixed-contact convergence.

The limit/tolerance are research controls, not published settings. Reaching the cap is not a convergence guarantee. Compression still uses explicitly configured PGS iterations. The game remains on 0.9.0.

Built WASM SHA256 85714e33c03d99da758023b0f9c824a01c94b9c9369f7a54b0cb8d7f19f59990, 3,301,889 bytes; native build 4m39s. Original 93 tests pass. Expanded unequal-mass suite: 113 pass, four fail on 0.00104904 J energy error against the unchanged 0.001 J gate (20/1/20 kg elastic fixture, both timesteps/orderings). Preserve this failure; do not publish.

At 16 compression iterations, all 108 positive-restitution mass cases have final velocity error below 0.000009 m/s; zero restitution remains underconverged. At 256 compression iterations, maximum zero-restitution velocity error falls below 0.000000734 m/s. This motivates bounded compression convergence rather than a high global setting. Next experiment will tighten the rebound residual to 1e-6 * length_unit and add an explicitly restricted frictionless normal-compression residual.
