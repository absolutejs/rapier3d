# Snapshot-order continuity after 0.16.0

The published 0.16.0 runtime reproduces the retained immediate snapshot
roundtrip mismatch on a freshly created 32-assembly impact fixture. Five
successive restores change two/three bytes each while public body state remains
equal. Controls at 1, 8 and 64 assemblies, and snapshots after one step, are
exact in this run. `probe.ts` saves all 48 snapshots and all 40 roundtrip rows,
then exits nonzero if any complete snapshot differs. No assertion is replaced
by a physical-state-only check.

The fixture reconstructs the retained coupled-impact setup using the actual
installed registry engine. `published-0160/result.json` records engine/source
hashes, full difference counts and bounded differing-byte details. Production
physics source remains unchanged from release `f6e8244`.

`decode.rs` reads the real native version-1 schema and records field boundaries.
It then decodes the original pending multibody wake/join sequences directly,
checking membership against the native-deserialized sets. This is intended to
identify the differing bytes before deciding whether canonical serialization,
deterministic queue consumption, or another correction is required. Decoder
qualification is in progress; the collection responsible is not yet claimed.
