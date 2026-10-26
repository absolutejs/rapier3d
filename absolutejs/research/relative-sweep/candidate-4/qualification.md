# Candidate 4 — sensor deduplication, still unqualified physics

Deduplicate eligible transient sensor crossing events by canonical collider-handle
pairs within a continuous solve. The regression fails on candidate 2 and passes
here: one ordered start/stop pair, not two reversed pairs. Solid/non-solid and
collision-group controls pass. All 135 sphere observations exactly match candidate
3, including its cap-one limitation. This is an independent correctness fix to the
relative-sweep candidate, not a fix for compound overlap or kinematic activation.
The game remains on registry 0.3.0; no candidate is physically accepted or published.
