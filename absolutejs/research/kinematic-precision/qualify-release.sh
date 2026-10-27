#!/usr/bin/env bash
# Run after both native builds and path-portability/audit.py have completed.
# Uses CPU-only Chromium and a loopback server; does not start a native GPU path.
set -euo pipefail
cd "$(dirname "$0")/../../.."
if [[ $# != 1 || ! -f "$1" ]]; then
  echo 'Expected an explicit private research WASM negative control' >&2
  exit 1
fi
research_kernel="$(realpath "$1")"
receipt_dir=absolutejs/research/kinematic-precision
test -f "$receipt_dir/path-portability/comparison.json"
test "$(bun --version)" = '1.4.4+absolute.1'
mkdir -p .absolutejs/logs .absolutejs/pack .absolutejs/extracted
python3 absolutejs/scripts/test-native-build-flags.py > "$receipt_dir/path-portability/flag-tests.log" 2>&1
bun test absolutejs/tests > "$receipt_dir/tests.log" 2>&1
bun run tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler --types bun \
  absolutejs/tests/type-contract.ts absolutejs/tests/kinematic-path.test.ts \
  "$receipt_dir/path-probe.ts" "$receipt_dir/cap-probe.ts" "$receipt_dir/cost-probe.ts" > "$receipt_dir/types.log" 2>&1
bun run tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler --types bun \
  "$receipt_dir/qualify.ts" > "$receipt_dir/qualification-types.log" 2>&1
bun "$receipt_dir/path-probe.ts" dist/rapier.mjs "$receipt_dir/paths.json" > "$receipt_dir/path-portability/path-probe.log" 2>&1
bun "$receipt_dir/cap-probe.ts" dist/rapier.mjs "$receipt_dir/caps.json" > "$receipt_dir/path-portability/cap-probe.log" 2>&1
bun absolutejs/scripts/verify-browser.ts > "$receipt_dir/browser.log" 2>&1
cp .absolutejs/logs/browser-result.json "$receipt_dir/browser-result.json"
npm pack --ignore-scripts --json --cache .cache/npm --pack-destination .absolutejs/pack > "$receipt_dir/pack.json"
tar -xzf .absolutejs/pack/absolutejs-rapier3d-0.6.0.tgz -C .absolutejs/extracted
bun "$receipt_dir/path-probe.ts" .absolutejs/extracted/package/dist/rapier.mjs "$receipt_dir/tarball-paths.json" > "$receipt_dir/path-portability/tarball-probe.log" 2>&1
python3 "$receipt_dir/audit-pack.py"
bun "$receipt_dir/qualify.ts" "$research_kernel"
