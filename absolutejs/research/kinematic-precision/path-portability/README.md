# Portable native qualification, in progress

The initial 0.6.0 candidate passed physics and browser checks, but its post-bindgen WASM contains 229 occurrences of the local home prefix, including 119 checkout-name occurrences. Rebuilding in another checkout necessarily changes these strings and the hash. A fixed native qualification hash therefore needs a portable build, not a checkout-specific exception list.

The build now remaps checkout, Cargo cache and target roots to stable virtual prefixes. The actual source files are unchanged. Paths are canonicalized first, and flags use Cargo's unit-separator encoding so paths containing spaces stay intact. Existing flags follow Cargo's precedence rules. A changed native hash still requires qualification; the guard is not disabled.

References checked during implementation: [rustc source-path remapping](https://doc.rust-lang.org/rustc/remap-source-paths.html) documents textual replacement, last matching prefix precedence and the default all-scopes behavior; [Cargo environment variables](https://doc.rust-lang.org/cargo/reference/environment-variables.html) documents whitespace-split RUSTFLAGS and unit-separated CARGO_ENCODED_RUSTFLAGS. These mechanisms alone are not proof of reproducibility: compare actual post-bindgen artifacts from separate checkout paths and repeat artifact validation.

`flag-controls.json` checks argument encoding and precedence. `native-build.log` records the first remapped build with two Cargo jobs. The previous runtime and raw kernel are preserved under `.absolutejs/path-dependent/`; the initial qualification receipts still identify their original hashes until replacement receipts are recorded.

## Build inputs and final qualification

Both native compilations use the two-file stable native source from commit `73c2395`, Rust 1.94.0, wasm32-unknown-unknown release mode, the locked offline Cargo dependency set, two build jobs and wasm-bindgen 0.2.129. The independent checkout is `~/alex/rapier-kinematic-repro`; both use the same resolved dependency/target caches, sequentially. Each invocation supplies its own checkout root to `native-build-flags.py`. Sharing a target cache does not substitute a copied artifact: both native compilations are recorded in separate logs.

The original path-dependent receipts are retained under `initial-qualification/`. The remapped path matrix matches all 2,160 frames of that original artifact exactly. An attempted suite run during compilation hit the existing 10-second wall budget in two long parity fixtures; `concurrent-suite-timeout.log` preserves that incomplete run. Qualification requires a fresh sequential run with unchanged limits.

After both artifacts exist, run `audit.py FIRST_POST_BINDGEN_WASM SECOND_POST_BINDGEN_WASM comparison.json` from this directory (or supply the full receipt path from the repository root). After successful comparison, run `bash absolutejs/research/kinematic-precision/qualify-release.sh /absolute/path/to/private/research.wasm` from the repository root. This command stops on failures, runs the CPU-only browser worker and audits the extracted npm artifact. It never invokes npm publish.

## Outside-workspace package hashing

The first remapped pair failed byte identity: both kernels were 3,293,982 bytes with identical printable strings, but function/code/data sections differed. Repeating wasm-bindgen against the same raw kernel reproduced its hash, isolating the difference upstream of bindgen. `initial-comparison-failure.json` retains section hashes. Cargo's [SourceId::stable_hash implementation](https://doc.rust-lang.org/stable/nightly-rustc/src/cargo/core/source_id.rs.html) strips the workspace prefix only for contained path dependencies. The upstream bindings workspace points outside its root to `../../crates/rapier3d`, so the engine package identity remains checkout-dependent despite rustc path remapping.

`prepare-native-workspace.py` now snapshots canonical source bytes into a content-addressed directory under `.absolutejs/native-source/`. It places the engine and binding crate inside one workspace root. Engine manifest inheritance is resolved from canonical workspace values, features are merged, and unused engine development dependencies are excluded from this runtime dependency build. The original Rust files and locked package versions are unchanged. `dependency-graph.json` proves equality of all 85 resolved packages, enabled features and dependency edges between original and staged manifests. The canonical source stays in Git; this generated snapshot is a reproducible build artifact, never the only copy.

The new staged builds still require independent checkout byte comparison and complete qualification. They are not yet approved for publication.
