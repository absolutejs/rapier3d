#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
export CARGO_HOME=/home/alexkahn/alex/hello-world/.cache/physics/cargo
export CARGO_BUILD_JOBS=1 CARGO_NET_OFFLINE=true
export CARGO_TARGET_DIR="$PWD/.cache/source-qualified"
evidence=absolutejs/research/contact-softness-controls
cargo test --locked --release --manifest-path absolutejs/research/predictive-recycle/Cargo.toml --test contact-softness-native --test predictive-support-native > "$evidence/native-serial.log" 2>&1
cargo test --locked --release --manifest-path absolutejs/research/predictive-recycle/Cargo.toml --features parallel --test contact-softness-native --test predictive-support-native > "$evidence/native-parallel.log" 2>&1
cargo check --locked --release --manifest-path absolutejs/research/aggregate-free-transport/no-std/Cargo.toml > "$evidence/native-no-std.log" 2>&1
printf 'Native serial, parallel and no-std gates passed\n'
