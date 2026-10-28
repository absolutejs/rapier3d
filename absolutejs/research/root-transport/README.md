# Private finite root-coordinate transport experiment

Baseline: published 0.9.0, no rejected restitution changes. This is private research, not a release candidate. The game remains on the registry release.

The eight explicit zero-damping planar snapshots are explained by semi-implicit Euler root integration. Test replacing its first-order root-to-assembly-COM coordinate transport with the finite rotation used by the native root orientation. The correction derives from the initial offset, old/new angular velocity and timestep; it does not measure and clamp a conservation error.

Scope gates: floating six-DOF root, at least two positive-mass dynamic bodies, only fixed internal joints, zero generalized damping/armature/friction/springs, no locked bodies and zero root-local COM offset. Existing default-damping and hinge cases are controls. This restrictive gate is experimental isolation, not the intended shipping policy.

At each substep, retain old omega and root-to-COM offset r before loading accelerated/solved velocities. After integrating rotation, let rNew=exp(omegaNew*dt)*r and aGeometry=omegaOld×(omegaOld×r). Add rNew-r-dt*(omegaNew×r)-dt²*aGeometry to root position and omegaNew×(rNew-r)-dt*aGeometry to root velocity. Write corrected generalized velocities back to the solver before subsequent stages.

Qualification must measure free-flight momentum, angular momentum, energy, COM motion, root ordering, force/torque response and contact behavior. General 3D gyroscopic integration, changing topology and articulated joints remain separate concerns. Do not publish based only on the planar reproduction. Native build uses two CPU jobs and a checkout-specific target directory.

## First experiment result

Native SHA256 `6e3e1a6d2fc8dd0e60c83c36e2f3f2879856039afef151ed4d6a28c7eda8e580`, 3,296,852 bytes. Native compilation succeeds, followed by expected stable-hash rejection and explicit private API packaging. Game diagnostics complete 80 published/80 candidate diversity cases plus 32 zero/32 default controls. Default damping, compound, translation and excluded local-COM controls remain exactly unchanged. Planar drift improves substantially; nonprincipal 3D drift remains. This is not qualified for release. Full replay data and comparisons are in hello-world/docs/root-transport-2026-10-27.

## Second experiment: explicit COM coordinates

Keep the same scope gates, adding exclusion of generalized couplings. Compute COM velocity from the previous rigid state, net physical force times dt/mass, and the constraint-solved generalized increment after subtracting the native acceleration increment. Integrate COM semi-implicitly, rotate its root offset using the solved angular velocity, and reconstruct root position/velocity. This avoids assuming that the native semi-implicit Coriolis contribution equals a first-order centripetal term in nonprincipal rotation. It is still an experiment: force/torque response, contact coupling, angular momentum and energy require validation.

## Second experiment result

V2 WASM SHA256 `9ec6f201736eee091bc27d3407008889dbbcf7d4e818bc5a4b0f124ec3ef3c5e`, 3,297,148 bytes. Native and API build logs are retained. Diversity/default/zero controls complete; compound and excluded local-COM controls and 32 default cases remain exact. Forty identical captured-load controls improve linear momentum substantially. The energy oracle now distinguishes normal constant-force semi-implicit COM policy from extra drift, preserving raw metrics. Forty-eight impact runs still expose momentum error and energy gain; this experiment remains unqualified. Full measured evidence: hello-world/docs/root-com-integration-2026-10-28. Source currently subtracts old velocity then native increment separately; possible floating-point cancellation is not yet changed.
