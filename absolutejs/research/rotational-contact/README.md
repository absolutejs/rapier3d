# Private rotational/contact combination

Base engine: dd8ad68, the blocked pure rotational candidate. This separate
checkout adds only support-bound-associated GJK directions to the interval
sweep algorithm. No persistent triangle-frame or composite-bound changes.

The old `rotational-sweep/` evidence belongs to the pure candidate, not this
combination. New evidence lives here. The zero native identity intentionally
prevents packaging an unbuilt candidate. Canonical game stays on 0.16.3.

First gates: seeded oak query; original sweep matrix/control suite and four
native configurations; captured step and full oak excavation in WASM; then
24 paired tree cases and full-game validation. No thresholds are relaxed.

Parry pinned to native-tested `8c68a625c15930ca8b685f30861aedf5d59c3726`.
The first locked fetch correctly rejected a missed explicit binding-manifest
pin. After updating that manifest, an exact parsed lock comparison confirms
only the intended Parry source revision changes. Failed fetch logs retained.
Native build uses the immutable source workspace recorded in source-path.txt,
offline Cargo and one compiler job. Package results still pending.
