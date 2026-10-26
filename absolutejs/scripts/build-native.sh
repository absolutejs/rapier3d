#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ "$(rustc --version)" != 'rustc 1.94.0 (4a4ef493e 2026-03-02)' ]]; then
  echo 'This release is qualified with Rust 1.94.0; use that toolchain.' >&2
  exit 1
fi
export CARGO_HOME="${CARGO_HOME:-$PWD/.cache/cargo}"
export CARGO_TARGET_DIR="$PWD/.cache/target"
export CARGO_BUILD_JOBS=2
cargo build --locked --release --target wasm32-unknown-unknown --manifest-path bindings/typescript/builds/hello-wasm/Cargo.toml
python3 absolutejs/scripts/install-bindgen.py
bun run build:api
