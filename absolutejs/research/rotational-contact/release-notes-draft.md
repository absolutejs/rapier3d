# @absolutejs/rapier3d 0.17.0 — draft, not published

A rotating object can cross a surface between two clear endpoint poses. The
3D direct-sweep query now advances using bounded rotational motion intervals
to catch the captured thin-bar crossing. Translation-only sweeps retain their
existing path; queries retain the existing 25-query cap and explicit failure.

Stalled convex queries also keep their best support bound paired with the
direction that produced it. This prevents the captured cached triangle/tree
query from clipping contacts against an unrelated direction and reporting
about 202 mm penetration where a separate plane calculation bounds required
separation to about 0.013 mm.

Both fixes ship together because the rotational correction alone exposed that
contact error in the full oak excavation test. The combined candidate passes
that test and all 844 game tests. Package API and snapshot layout are unchanged.

Qualification and release gates are in release-plan.md. Known remaining raw
variant-5/960 terrain rejection is unchanged. These fixes do not certify every
composite broad-phase sweep, arbitrary material geometry, or frame rate.
No game tolerance, solver budget, friction or restitution setting is relaxed.
