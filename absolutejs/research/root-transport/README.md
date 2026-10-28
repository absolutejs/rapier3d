# Private finite root-coordinate transport experiment

Baseline: published 0.9.0, no rejected restitution changes. This is private research, not a release candidate. The game remains on the registry release.

The eight explicit zero-damping planar snapshots are explained by semi-implicit Euler root integration. Test replacing its first-order root-to-assembly-COM coordinate transport with the finite rotation used by the native root orientation. The correction derives from the initial offset, old/new angular velocity and timestep; it does not measure and clamp a conservation error.

Scope gates: floating six-DOF root, at least two positive-mass dynamic bodies, only fixed internal joints, zero generalized damping/armature/friction/springs, no locked bodies and zero root-local COM offset. Existing default-damping and hinge cases are controls. This restrictive gate is experimental isolation, not the intended shipping policy.

At each substep, retain old omega and root-to-COM offset r before loading accelerated/solved velocities. After integrating rotation, let rNew=exp(omegaNew*dt)*r and aGeometry=omegaOld×(omegaOld×r). Add rNew-r-dt*(omegaNew×r)-dt²*aGeometry to root position and omegaNew×(rNew-r)-dt*aGeometry to root velocity. Write corrected generalized velocities back to the solver before subsequent stages.

Qualification must measure free-flight momentum, angular momentum, energy, COM motion, root ordering, force/torque response and contact behavior. General 3D gyroscopic integration, changing topology and articulated joints remain separate concerns. Do not publish based only on the planar reproduction. Native build uses two CPU jobs and a checkout-specific target directory.

## First experiment result

Native SHA256 `6e3e1a6d2fc8dd0e60c83c36e2f3f2879856039afef151ed4d6a28c7eda8e580`, 3,296,852 bytes. Native compilation succeeds, followed by expected stable-hash rejection and explicit private API packaging. Game diagnostics complete 80 published/80 candidate diversity cases plus 32 zero/32 default controls. Default damping, compound, translation and excluded local-COM controls remain exactly unchanged. Planar drift improves substantially; nonprincipal 3D drift remains. This is not qualified for release. Full replay data and comparisons are in hello-world/docs/root-transport-2026-10-27.
