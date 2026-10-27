# Rapier 0.6.0: prescribed kinematic integration qualification

The final artifact passes portable-build and release qualification. Two separate
checkout builds produce identical WASM bytes with no local path leakage.
`path-portability/` preserves the original failed comparisons and the correction;
the original path-dependent tarball is superseded and must not be published.
Registry publication remains a separate delivery step.

Velocity-driven kinematic motion previously accumulated linearized angular increments and tiny positional increments at each temporal subdivision. That makes the actual path depend on the subdivision count despite a prescribed constant velocity. Over half a second at 30rad/s, the one-subdivision test accumulates about 0.30128rad of angular error and 0.11115m of body-origin error with an offset mass center.

The release evaluates center-of-mass position and rotation directly from each CCD-pass start at elapsed time, using the already speed-capped velocity. It reuses the existing flag byte and adds no per-body allocation. Dynamic integration, position-driven endpoints, soft-frame proxies and articulated-body integration retain their existing paths. The direct center-of-mass formula avoids the prototype's intermediate body-pose conversions.

Only `solver_body.rs` and the staged worker's integration branch change native behavior. This worktree starts at stable `73396d1`; no private tagged shape geometry, contact equation, CCD policy or research branch is merged. `source-transfer.patch` records the initial isolated prototype transfer; `candidate-native.json` identifies the final optimized native source hashes, and `qualification.json` verifies those hashes and the final kernel.

Validation:

- Published 0.5.0 fails all four new path regression configurations; its position-driven and speed-limit controls pass (`baseline-negative-tests.log`).
- Full stable suite: **28 pass, zero failures, 48,020 assertions**. The four existing dynamic-only motion comparisons still match official upstream. Six new tests also pass through the public package export after strict typing exposed the untyped direct `.mjs` import in the initial test.
- The independent 72-configuration path probe covers three body types, four subdivision budgets, centered/displaced mass centers, and three angular speeds. All 24 velocity-driven cases stay below 3 micrometers / 2 microradians over half a second. All 1,440 dynamic and position-driven control frames remain identical to 0.5.0.
- Eight signed speed-cap controls pass. Strict TypeScript checks cover the public API contract and new tests/probes.
- The bounded browser worker passes with GPU disabled, including the new low-subdivision path check and prior contact, snapshot-owner, profiler, CCD and fresh-query controls. The initial restricted-sandbox loopback denial is preserved separately; the permitted rerun passes.
- The extracted npm artifact reproduces all 72 path configurations. Runtime bytes match the qualified build, all existing declarations are byte-identical, and package contents pass an explicit whitelist. npm's automatic root README is included. The build now synchronizes the canonical `absolutejs/README.md` to the npm root README to avoid stale integration claims.
- The stable native guard accepts the specifically qualified kernel and rejects actual private research WASM bytes. Missing or non-WASM negative controls fail qualification instead of being counted as successful rejection.

CPU tradeoff: direct rotation evaluation adds work for velocity-driven kinematic bodies. Three alternating bounded samples with 128 such bodies and four subdivisions observed median step times of 0.344ms before / 0.682ms after; at 128 subdivisions, 1.382ms / 2.046ms. Other configurations and all raw samples are retained in `costs.json`. These no-contact, no-CCD CPU observations are not a statistical capacity guarantee or browser FPS measurement. Dynamic-body integration is unchanged; kinematic-heavy workloads should be profiled.

This release improves prescribed paths, not general material separation. Floating point rounding and contact/CCD limitations remain. Source tests and receipts are durable; generated baselines, bindgen output and extracted tarballs live under the ignored `.absolutejs/` directory and are reproducible.

Reproduce qualification after the documented build/tests and pack audit with:

```sh
bun absolutejs/research/kinematic-precision/qualify.ts /path/to/private-research/rapier_wasm3d_bg.wasm
```

The negative kernel path is explicit. `qualification.json` records its actual hash. Registry publication and adoption receipts will be recorded separately after npm confirms publication.

Final portable qualification: the sequential suite passes all 28 tests / 48,020 assertions in 23.60 seconds with unchanged per-case limits. Strict types, CPU-only browser checks, extracted-tarball controls and private-kernel rejection pass. Both independent builds produce native SHA-256 `17f66b696ecebb8180f8ab01fe1a4773c3565e4e56b3e7db74e51183590b06f4` (3,291,678 bytes). All 275 Rust source files match the canonical repository, all 85 resolved dependency graph nodes match the original graph, and all 2,160 prescribed-path/control frames match the initial candidate. `qualify-release.sh` reproduces the sequential artifact checks.

Registry publication verified: npm now serves `@absolutejs/rapier3d@0.6.0`; both registry integrity and SHA-1 match the qualified tarball (`registry.json`). The initial propagation 404 is preserved separately. Source/tag `absolutejs-v0.6.0` points to `3197554`.
