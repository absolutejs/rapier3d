#!/usr/bin/env bash
set -euo pipefail
research_dir=absolutejs/research/contact-softness-controls
rg -q 'Finished `release` profile' "$research_dir/native-build.log"
mkdir -p .absolutejs/api .absolutejs/pack
.cache/tools/wasm-bindgen-0.2.129-x86_64-unknown-linux-musl/wasm-bindgen --target web --out-dir .absolutejs/api .cache/target/wasm32-unknown-unknown/release/rapier_wasm3d.wasm
python3 - <<'PY'
from pathlib import Path
import hashlib,json
p=Path('absolutejs/native-kernel.json');d=json.loads(p.read_text());assert d.get('researchOnly') is True
assert json.loads(Path('package.json').read_text()).get('private') is True
wasm=Path('.absolutejs/api/rapier_wasm3d_bg.wasm').read_bytes();d.update(wasmSha256=hashlib.sha256(wasm).hexdigest(),wasmBytes=len(wasm));p.write_text(json.dumps(d,indent=2)+'\n')
Path('absolutejs/research/contact-softness-controls/native-identity.json').write_text(json.dumps({'scope':'Private qualification identity; not release approval','native':d},indent=2)+'\n')
PY
bun run build:api > "$research_dir/api-build.log" 2>&1
bun test absolutejs/tests > "$research_dir/package-tests.log" 2>&1
npm pack --cache .cache/npm-pack --ignore-scripts --json --pack-destination .absolutejs/pack > "$research_dir/pack.json"
python3 absolutejs/scripts/audit-pack.py "$research_dir/pack.json" "$research_dir/pack-audit.json" --research > "$research_dir/pack-audit.log"
