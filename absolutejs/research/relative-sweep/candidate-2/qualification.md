# Candidate 2 — not qualified for production

Moving compounds use their child BVH and two moving proxy sweeps, retaining the
upstream compound initial-overlap core fallback. Full-world native-envelope peak
overlap improves from registry 4.0587% and candidate-1 16.1132% to 0.60795%.
The one-step sphere matrix remains 0 crossings and 0 energy increases in 135 cases.

Stronger frame-invariance checks remain failing: maximum frame-space position
error is 1.195m at cap 1, 0.29875m at cap 4 and 0.07469m at cap 16. The native
splitter intentionally steps beyond first impact, then clamps positions, discarding
some frame translation. Candidate 3 will separately test exact-impact subdivision.
No physical acceptance gate was weakened; this remains a private research candidate.
