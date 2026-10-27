# Stable native build qualification guard

The private solver research and stable package share a Cargo target cache. Previously an API-only build could consume whichever native kernel was last compiled. Published 0.5.0 was manually verified against the qualified 0.4.0 native bytes before release; this guard makes that check mandatory for future builds.

`absolutejs/native-kernel.json` identifies the qualified post-bindgen WASM hash and byte count. `build-api.ts` checks both before writing the distribution and derives the solver-change provenance from the qualification manifest. Native qualification is a release decision, not an automatic cache update.

Controls:
- `result.json`: actual stable bytes accepted; candidate-16 research bytes rejected.
- `negative-build.json` and log: actual API build with candidate-17 raw native in the shared cache exits 1; existing stable bundle remains byte-identical.
- `positive-build.json` and log: stable native rebuilt from stable source, then API packaging succeeds. Both native and bundle hashes match the already qualified 0.5.0 payload.
- `types.log`: strict TypeScript check of the guard and evidence runner.

This is source build tooling; no runtime change or new npm release is needed. Research remains private and unqualified. Hash identity establishes artifact provenance, not physical correctness of a new solver.

Runtime regression rerun: 21 of 22 tests pass. The 1920Hz/0.3-radian upstream motion parity test reaches its existing 10-second work ceiling, both in the suite and in an isolated retry; no motion mismatch is reported before the cutoff. Both logs are retained. Do not claim this rerun passed all 22 tests. The rebuilt native and JavaScript hashes still match the previously qualified/published payload exactly. The work ceiling was not relaxed.
