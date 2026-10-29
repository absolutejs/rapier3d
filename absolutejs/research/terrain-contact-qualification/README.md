# Private duplicate-CSO guard engine qualification

Base delivered engine 0.17.0 (9366e15). Native reduction identifies an exactly
duplicated CSO vertex admitted as a fourth point by a rounded face-plane test.
The degenerate simplex produces a false Intersection, failed contact fallback
and an empty cached terrain pair. A narrow exact-duplicate guard is being
qualified in Parry; no recycling/tolerance/solver settings are changed.

This private package identity is deliberately unqualified until a new native
build passes physical qualification. Source pin and checks follow. Canonical
game stays on published 0.17.0.
