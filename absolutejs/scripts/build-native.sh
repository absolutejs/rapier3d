#!/usr/bin/env bash
set -euo pipefail
cd -P "$(dirname "$0")/../.."
if [[ "$(rustc --version)" != 'rustc 1.94.0 (4a4ef493e 2026-03-02)' ]]; then
  echo 'This release is qualified with Rust 1.94.0; use that toolchain.' >&2
  exit 1
fi
if [[ "$(cargo --version)" != 'cargo 1.94.0 (85eff7c80 2026-01-15)' ]]; then
  echo 'This release is qualified with Cargo 1.94.0; use that toolchain.' >&2
  exit 1
fi
export CARGO_HOME="${CARGO_HOME:-$PWD/.cache/cargo}"
export CARGO_TARGET_DIR="$PWD/.cache/target"
export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-1}"
mkdir -p "$CARGO_HOME" "$CARGO_TARGET_DIR"
export CARGO_HOME="$(python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).resolve())' "$CARGO_HOME")"
export CARGO_TARGET_DIR="$(python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).resolve())' "$CARGO_TARGET_DIR")"
native_source="$(python3 absolutejs/scripts/prepare-native-workspace.py)"
export CARGO_ENCODED_RUSTFLAGS="$(python3 absolutejs/scripts/native-build-flags.py "$native_source" "$CARGO_HOME" "$CARGO_TARGET_DIR")"
cargo build --locked --release --target wasm32-unknown-unknown --manifest-path "$native_source/bindings/typescript/builds/hello-wasm/Cargo.toml"
python3 absolutejs/scripts/install-bindgen.py
bun run build:api
