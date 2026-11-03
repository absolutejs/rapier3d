# Host sweep workload probe

Research source based on published 0.21.1. The opt-in `sweep-probe` feature is off
by default and is not present in shipped WASM. It retains only 15 scalar counters
per thread and resets before each captured host step. The extra mesh BVH query
for counting candidates adds overhead; probe timers are not production timings.

Inputs are authenticated compressed captures in the game repository at
`docs/stone-sweep-workload-2026-11-03/`. Decompress under `.absolutejs/` after
checking each recorded SHA256. Both the host baseline and instrumented builds
require full snapshot payload reserialization. All three instrumented post-step
payloads exactly match the uninstrumented host. Host body results match the WASM
step only at index 960, so browser qualification remains mandatory.

Counter order: pieces, candidate callbacks, same-body rejects (excluding exact
self), eligible pairs, prepared pieces, preparation ns, cast pairs, cast ns
including counting overhead, subshape queries, mesh triangle candidates,
rotating queries, hit, separated, overlapped, failed.

Baseline: `cargo build --locked --release --manifest-path
absolutejs/research/terrain-sweep/Cargo.toml`. Probe: add `--features probe`.
Use one job and the pinned offline Cargo cache. The inspector accepts before.bin,
after.bin, output-prefix, and steps only once. It does not mutate input files.
The raw post-step payload permits exact host baseline/probe comparison.

Observed candidate callbacks/same-body rejects/eligible pairs:
- step 480: 78120 / 77080 / 520
- step 960: 78120 / 77080 / 520
- step 2400: 65160 / 64440 / 360

The failed first probe build lacked an explicit `std::thread_local!` macro path;
the fixed build succeeds. This was a diagnostic build error, not a physics result.
