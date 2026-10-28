# Private final-pose restitution experiment

Based on published 0.8.1, with no previous restitution sweep experiments. The game analytic reduction is backed up at e55790e. This branch is private and not publishable.

Hypothesis: rebuilding ordinary-body simplified-friction restitution lever arms about a common contact point at final centers of mass removes the measured planar angular-momentum transport error. Recompute projected normal mass consistently. Preserve inactive SIMD lanes. This intentionally does not change generic/multibody constraints or ordinary integration.

Limitations: cached world inverse inertia may be stale in general 3D; normal direction, restitution seed, tangential impulses and coupling are unchanged. Even a successful planar result is not a qualified solver fix. Compare the exact touching, zero-bias fixture against published 0.8.1; measure energy and both momenta, then retain all failures. Native build limited to two CPU jobs in checkout-specific storage.
