# Predictive support admission before reduction (private)

The exact production reducer drops both outer corners of a moving tilted patch
although the caller's velocity-prediction rule accepts them. The baseline failure
and exact baseline reducer/harness are retained. This is a separately established
eligibility mismatch, not yet a proven explanation for the tree clearance failure.

The candidate supplies the existing complete admission predicate to reduction,
including contact skins, soft-body margin and relative normal velocity. It uses
the same predicate again for final solver admission. No distance threshold,
solver budget or iteration policy changes. The small-manifold path applies the
same filter. There are no new heap allocations; prediction checks can run in
each of the bounded selection scans rather than only for the final four points.

Five tests pass using the exact production reducer source with Parry's actual
ContactManifold type (unit user-data): approaching support extent, stationary/
receding exclusion, skin margin, empty/small selection and ten reordered patches.
This isolated harness does not compile or qualify the complete narrow phase.
Full browser-engine compilation, package tests, captured replay and tree matrix
are next. Native and game acceptance remain pending; no release is claimed.
