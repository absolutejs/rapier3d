# Gyroscopic increment and package identity qualification

Candidate 0.7.0 changes one native function relative to published 0.6.0: apply the computed gyroscopic momentum increment to the existing angular velocity instead of reconstructing the full velocity through principal inertia and its inverse. True gyroscopic precession remains enabled. No private contact-oracle or CCD experiments are included.

The 336-case free-spin matrix uses analytic principal/isotropic paths and an independently checked double-precision Euler/RK4 reference. Worst relative energy error decreases from 0.00403270 to 0.000561975 over 0.1 seconds. One tilted long-box case regresses by 1.305 ppm. Finite-precision conditioning and low-resolution integration errors remain. The audit verifies source hashes, reference identity, complete case coverage and cap exclusions. The published 0.6.0 negative control fails four new precision tests but passes the genuine-precession control.

The solver-contact tests now compare queried and unqueried candidate worlds to preserve their actual API non-mutation contract. Exact upstream dynamic parity is no longer appropriate for an intentional solver correction. `upstream-motion-probe.ts` separately records the full two-second cavity/chip comparisons: these sensitive multi-contact trajectories diverge, sometimes substantially. Those differences are not evidence of better contact physics. The contact test wall budget increases from 10 to 20 seconds after a 1920Hz case exceeded the old limit; simulation duration and equality assertions are unchanged. Initial failed logs are retained. An early metadata test ran before provenance generation completed; its missing-file failure is preserved, then tests are run after the completed build.

The new `@absolutejs/rapier3d/build-info` subpath reports the packaged WASM identity without loading the physics bundle or initializing WebAssembly. Metadata is frozen and also exposed on the main module and provenance JSON. It describes the package artifact, not custom bytes supplied to `init(input)`. Build tests compare the hash to actual native bytes and import the lightweight entry with WebAssembly disabled. Browser checks use a CPU worker with GPU disabled and a 20-second budget.

Release status: package qualification passes; not published or adopted by the main game. Two independently staged native builds match exactly (SHA-256 `c80fd631798a17f0a25160436921b08bce302a506d82a11d0bd51f839353708e`). All 35 tests / 48,051 assertions pass, plus type checks, GPU-disabled browser controls and tarball byte checks. Extracted-tarball paths preserve all 1,440 prescribed-motion frames across 48 configurations; 476 dynamic frames change intentionally. Signed speed-cap controls pass. The full isolated game validation is pending before publication/adoption. The private experimental solver remains unqualified and unpublished.

The warmed paired CPU matrix (six configurations, five alternating pairs each) has median candidate/baseline ratios from 0.798 to 1.088. Timing ranges overlap; this run does not support a speedup claim. The correction adds precision, with possible CPU cost requiring hardware-level measurement in the real workload. Full raw samples and load averages are retained.

## Reproduction

Use BVM Bun 1.4.4+absolute.1 and the Rust/Cargo/bindgen versions enforced by `build-native.sh`. Build native code sequentially with two Cargo jobs. Build the API only after the native checksum manifest matches the intentionally qualified artifact. Keep full tests and timing probes separate from compilation.

- `bun test absolutejs/tests` checks runtime contracts and precision. `RAPIER_TEST_ENGINE=/absolute/path/to/published-0.6/rapier.mjs bun test absolutejs/tests/free-spin.test.ts` is the deliberately failing negative control.
- Run `free-spin-probe.ts <engine> <output>` for baseline and candidate; `audit-spin.py` verifies comparable evidence and reports regressions.
- `upstream-motion-probe.ts` records dynamic differences without silently replacing exact upstream parity with a loose tolerance.
- `cost-probe.ts <baseline> <candidate> <output>` records warmed, paired CPU measurements and load averages.
- `verify-browser.ts` uses a GPU-disabled worker. Pack with `npm pack --ignore-scripts --json`; `audit-pack.py` compares every distribution file.
- Run the existing kinematic `path-probe.ts` against the extracted tarball, then `audit-paths.py` verifies unchanged prescribed motion. Run its `cap-probe.ts` for signed speed limits.
- `audit-repro.py <second-checkout>` compares native outputs from separately staged source roots and records hashes. The build recipe is checkout-path reproducible under the pinned toolchain, not a cross-toolchain guarantee.
