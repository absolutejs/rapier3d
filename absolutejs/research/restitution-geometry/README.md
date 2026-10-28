# Private final-pose restitution experiment

Based on published 0.8.1, with no previous restitution sweep experiments. The game analytic reduction is backed up at e55790e. This branch is private and not publishable.

Hypothesis: rebuilding ordinary-body simplified-friction restitution lever arms about a common contact point at final centers of mass removes the measured planar angular-momentum transport error. Recompute projected normal mass consistently. Preserve inactive SIMD lanes. This intentionally does not change generic/multibody constraints or ordinary integration.

Limitations: cached world inverse inertia may be stale in general 3D; normal direction, restitution seed, tangential impulses and coupling are unchanged. Even a successful planar result is not a qualified solver fix. Compare the exact touching, zero-bias fixture against published 0.8.1; measure energy and both momenta, then retain all failures. Native build limited to two CPU jobs in checkout-specific storage.

## Results: rejected for delivery

The private binary SHA256 is `46fe05c6a9e94721d58d253181957572d89e1630c5d669c6e16bea5d74de98c2` (3,296,774 bytes). `build.log` includes successful native compilation and the expected stable-hash rejection; `api.log` records subsequent explicit private packaging. No release was published and the game is unchanged.

All 24 selected controls completed. The twelve untouched multibody rows exactly equal the published baseline, including their final body states. Restitution-zero ordinary-body controls also remain unchanged. At 60 Hz/four iterations/restitution one, ordinary-body maximum angular momentum error falls from 0.186363439 to 0.000025117 kg m²/s. However final energy falls from approximately 40 J to 39.978523465 J. At 240 Hz/four iterations it instead rises to 40.009155315 J. Therefore this is not a qualified correction.

`audit-energy.py` independently reconstructs final contact midpoint, lever arms, analytic inertia, projected mass and the restitution impulse from the inelastic control state. Its eight energy predictions match first-step measurements within 1.68e-6 J. The geometry change accounts for the residual energy defect: preserving the preparation-time restitution target with final-pose projected mass is inconsistent. Do not conceal it with an energy clamp.

The default 48-case matrix also completes: compound maximum energy gain 0.010182326 J, articulated maximum gain 0.276682261 J. Its angle/unit/timestep controls are retained in `default-matrix/`. No production tests are claimed for this rejected candidate.

Further work must address contact timing and state consistency together. General 3D inertia transport, friction and joint coupling remain unqualified. Separately isolate articulated free-flight integration; do not assume this ordinary-body reduction resolves it.
