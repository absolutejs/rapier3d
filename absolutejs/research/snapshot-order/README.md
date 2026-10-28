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

## Decoded cause and state impact

The decoder and independent audit identify `MultibodyJointSet.to_wake_up` at
byte range [141803, 142323). The two changed bytes exchange body handles 37 and
8 at sequence positions 1 and 63. Membership and every byte outside that set
are unchanged. This is a decoded field finding, not an inference from offsets.

`probe-sleeping-wake.ts` first sleeps 32 two-body assemblies, removes their
joints with wake-up requested, and saves before the next step. On published
0.16.0, body states remain equal but all eight post-step snapshots differ.
Decoding the first pair shows differing active-set IDs on 34 bodies and differing
island records. Hash-set wake processing changes the order sleeping chunks enter
the active set. Canonicalizing serialized bytes alone would not resolve this.

The private correction serializes unordered wake/join sets by handle index and
generation, and processes default-backend wake sets in that same deterministic
order. Impulse wake requests still precede multibody requests. Only queued edits
are sorted; there is no scan or sort of all world bodies. The enhanced-
determinism feature already uses insertion-ordered sets, so its existing wire
and consumption ordering are retained. Ordered connectivity event vectors remain
ordered and untouched; native payload layout and envelope version are unchanged.

Two native tests pass with one and two workers: 16 fresh/sleeping cases cover
both joint types at 1/8/32/64 assemblies, and two handle-reuse cases retain
generational identity. Every case checks immediate snapshot identity and eight
exact post-step snapshots. Feature-variant, no-std, WASM/browser, cost and full
game qualification are still pending. No public package release is prepared.

The enhanced-determinism variant also passes both native tests, retaining its
existing insertion-order semantics. The allocation-enabled no-std check passes.
All 19 broader assembly/topology tests pass; the existing comparator verifies
386 exclusion-control state records and 127 assembly measurements remain exact
against the retained baseline. `build-pressure-check.json` records Linux memory
and filesystem headroom for the bounded two-job build; it is not a Windows/GPU
health measurement. WASM/browser and cost qualification are now in progress.
