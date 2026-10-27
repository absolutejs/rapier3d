# Candidate 19: finite-box feature geometry, still private and unqualified

This extends candidate 18's explicitly tagged experiment to the actual finite cuboid's closest feature. Sphere radius and centered collider dimensions remain fixture-specific; there is no automatic shape detection. Zero friction/restitution, prescribed kinematic box and one centered sphere remain required. It must never be enabled in a public package by recognizing arbitrary user-data tags.

The helper uses the exact box signed distance and outward gradient, including faces, edges, corners and center-inside-box cases. The box angular derivative is `n cross (sphereCenter-boxCenter)` and the centered sphere angular derivative is zero. Both normal preparation paths retain consistent effective mass and separation. It still retains the existing scalar impulse policy.

`verify-features.py` checks 1,000 independent finite differences and distances (250 each face/edge/corner/interior, both box lengths and sign quadrants). Feature ties are nonsmooth and excluded from derivative assertions. Native probe controls:

- 4,284 untagged frames and 4,284 tag-only baseline frames match prior trajectories exactly.
- 150 tagged rotation cases include both box lengths, both body orders, static/separating cases, dedicated edge/corner starts and oblique rotation. There are no peak-depth regressions over 1 micrometer against their matching baseline. Maximum observed speed is 106.42m/s, below the source's 400m/s cap. Dedicated edge/corner runs remain separated; these are bounded fixtures, not exhaustive geometry qualification.
- At 960Hz on the short box, slow-rotation penetration falls from 1.059mm to 0.00824mm. Broad-face results remain close to candidate 18. Residual penetration remains in fast cases.
- Twelve intentional-overlap recovery runs reach the same approximately 0.203-micrometer final depth with or without tags. Initial 130–150mm overlap is intentional and reported separately.
- Full research suite: 21 pass / four retained upstream-motion parity failures, 48,827 assertions. Strict TypeScript checks pass for support, recovery and phase probes.

## Remaining mechanisms

`phase-probe.ts` preserves snapshots exactly with tracing enabled: 606 frames each at 32 and 128 configured subdivisions. At 240Hz/30rad/s with 32 subdivisions, one final CCD clamp changes separation from -0.03245mm after solving to -1.48656mm while the prescribed platform keeps moving. This is a separate dynamic-endpoint/kinematic-time mismatch. Do not repair it by shortening the user's prescribed path or by blindly dropping collision detection.

More subdivisions are not monotonically better. At 960Hz/6rad/s, 128 subdivisions reach 0.03449mm versus 0.01210mm at 32. The 128 trace attributes this increase to velocity-solve stages, not endpoint clamping; CCD changes the pass schedule. A common linear boost also changes relative trajectories (up to 0.435mm), with measurable cumulative prescribed-translation drift. These are unresolved accuracy issues. `analyze-policies.py` validates settings and engine hashes for 300 cases and rejects a deliberately mislabeled no-CCD policy. Disabling CCD changes planning and actual work, so its matrix alone cannot isolate clamping.

The next bounded hypothesis is accumulated kinematic pose-integration rounding: velocity-driven motion is prescribed, yet the solver repeatedly adds tiny increments. Test evaluating those poses from the CCD-pass start at elapsed time, preserving existing speed caps and leaving dynamic bodies untouched. This is distinct from the shape refresh experiment and must have its own controls.

All raw runs carry engine/source hashes. Single-run elapsed times are not performance benchmarks. Production stays on the published stable kernel; actual chip/cavity transfer, friction, restitution, arbitrary collider offsets, compounds, multipoint coupling and general feature transitions remain unqualified.
