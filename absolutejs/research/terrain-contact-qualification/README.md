# Private duplicate-CSO guard engine qualification

Base delivered engine 0.17.0 (9366e15). Native reduction identifies an exactly
duplicated CSO vertex admitted as a fourth point by a rounded face-plane test.
The degenerate simplex produces a false Intersection, failed contact fallback
and an empty cached terrain pair. A narrow exact-duplicate guard is being
qualified in Parry; no recycling/tolerance/solver settings are changed.

This private package identity is deliberately unqualified until a new native
build passes physical qualification. Source pin and checks follow. Canonical
game stays on published 0.17.0.

Private engine built successfully with one compiler job and its own target.
Parry pin: 53ac0b0. WASM fdcc8b0b5a568ef703c51ce0b77d6ae8508cac060757050adcece02cc7ed6e39.
Package archive SHA256 91c6527a06345570c91c06a271fc9a5e022ab3da77b01d9fe4acb354e89583a1.
237 existing tests and the added captured-onset regression pass. The bounded
GPU-disabled browser worker passes. The added fixture preserves step 876 of
variant 5 / 960 Hz: contact appears at 877 with ~0.01 cm separation, instead of
being absent through 879. All four steps replay exactly.

NOT RELEASE QUALIFIED: game matrix fixes variant 5 / 960 but introduces a
variant 0 / 960 rejection. Exact archive, 24-case matrix, four passing terrain
requests and failure snapshots are saved at game research commit 7ca30e40.
No public promotion, independent release rebuild or npm publish is appropriate
while this game rejection remains. Diagnostic toggle results depend on starting
state: do not mistake initial-state clustering-off success for a proven local
clustering defect. The new game trace captures first physical divergence at 871
and first terrain crossing at 881. Canonical game stays on 0.17.0.
