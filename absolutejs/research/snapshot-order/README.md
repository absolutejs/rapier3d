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
hashes, full difference counts and bounded differing-byte details. The baseline
uses the published runtime from release `f6e8244`; the correction below is tested separately.

`decode.rs` reads the real native version-1 schema and records field boundaries.
It then decodes the original pending multibody wake/join sequences directly,
checking membership against the native-deserialized sets. This is intended to
identify the differing bytes before deciding whether canonical serialization,
deterministic queue consumption, or another correction is required. The decoded finding and qualification results follow below.

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
exact post-step snapshots. Subsequent feature, browser and cost results follow below. No public package
release has been prepared.

The enhanced-determinism variant also passes both native tests, retaining its
existing insertion-order semantics. The allocation-enabled no-std check passes.
All 19 broader assembly/topology tests pass; the existing comparator verifies
386 exclusion-control state records and 127 assembly measurements remain exact
against the retained baseline. `build-pressure-check.json` records Linux memory
and filesystem headroom for the bounded two-job build; it is not a Windows/GPU
health measurement. Subsequent WASM/browser and cost results follow below.

## Private WASM and measured cost

The candidate WASM passes all 223 package tests (86,811 assertions), public
declaration checks and the GPU-disabled browser worker, including eight exact
sleeping-wake replay steps. Both original probes now pass: all 40 immediate
roundtrips and all eight sleeping-body replay steps are byte-exact, with equal
public body states. Packaged native SHA-256 is
`8639aa4bc16710820fcfc99274e1065bdf9ebfba7e3b5a27acc41fa2bdb8ca5d`
(3,357,015 bytes). The first build log records the expected qualification-guard
rejection before updating the explicitly private manifest.

The CPU benchmark uses 12 alternating pairs after four warmups at 1/8/32/128
assemblies. Physical first-wake results match 0.16.0 exactly throughout. At the
largest case (256 released bodies), observed median first-step time is 0.824 ms
baseline and 0.980 ms candidate; median paired ratio is 1.36. Pending snapshot
capture adds about 26.3 microseconds per capture there (paired ratio 1.16).
Smaller cases are noisy; their complete samples, including apparent speedups,
are retained without claiming a general speedup. Step timing excludes explicit
restore/serialization calls but includes normal VM effects. This is a bounded
host CPU workload, not hardware FPS or a general frame budget.

The independent two-job native build matches all 49 distribution files, the
packaged WASM and the raw WASM intermediate byte-for-byte. Native source inputs
also match exactly; see `independent-build-audit.json`. Full game qualification
is running in an isolated checkout. The kernel remains private until that gate
and the unchanged transport/impact comparisons pass.

## Completed game gate

Isolated game checkpoint `476e3fb76b2dfc0b67376cd186ae19bebdadf420` passes
843 tests (7,408,733 assertions), type/dependency checks and the browser-worker
bundle. Fresh published-0.16.0 and candidate transport runs retain 80 exact
roundtrips and replays each; all 160 before/after snapshots and all physical
measurement rows match across engines. The 1/8/32-assembly coupled-impact
comparison retains identical physical states and error/energy results. Its
median paired CPU ratios are 1.020/0.974/0.996; these bounded CPU results do
not establish rendering FPS or erase the sleeping-wake cost reported above.
The game branch retains both exact archives, scripts, logs and binary captures.

These completed gates qualify patch release 0.16.1. Promotion must change only
package identity and documentation; the native bytes remain those independently
rebuilt above. Registry publication and canonical game adoption remain pending.

## Publication verified

Source `876391b` is published as 0.16.1. After npm accepted the archive, six
checks retained its transient registry 404 responses without republishing. The
seventh check returned 200 and verified downloaded SHA-256, SHA-1 and SHA-512
against the audited archive. `publication-verified.json` is the final receipt.
