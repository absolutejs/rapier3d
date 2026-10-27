# Portable native qualification, in progress

The initial 0.6.0 candidate passed physics and browser checks, but its post-bindgen WASM contains 229 occurrences of the local home prefix, including 119 checkout-name occurrences. Rebuilding in another checkout necessarily changes these strings and the hash. A fixed native qualification hash therefore needs a portable build, not a checkout-specific exception list.

The build now remaps checkout, Cargo cache and target roots to stable virtual prefixes. The actual source files are unchanged. Paths are canonicalized first, and flags use Cargo's unit-separator encoding so paths containing spaces stay intact. Existing flags follow Cargo's precedence rules. A changed native hash still requires qualification; the guard is not disabled.

References checked during implementation: [rustc source-path remapping](https://doc.rust-lang.org/rustc/remap-source-paths.html) documents textual replacement, last matching prefix precedence and the default all-scopes behavior; [Cargo environment variables](https://doc.rust-lang.org/cargo/reference/environment-variables.html) documents whitespace-split RUSTFLAGS and unit-separated CARGO_ENCODED_RUSTFLAGS. These mechanisms alone are not proof of reproducibility: compare actual post-bindgen artifacts from separate checkout paths and repeat artifact validation.

`flag-controls.json` checks argument encoding and precedence. `native-build.log` records the first remapped build with two Cargo jobs. The previous runtime and raw kernel are preserved under `.absolutejs/path-dependent/`; the initial qualification receipts still identify their original hashes until replacement receipts are recorded.
