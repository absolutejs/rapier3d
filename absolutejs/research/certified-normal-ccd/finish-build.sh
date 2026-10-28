#!/usr/bin/env bash
set -euo pipefail
# Run only after native-build.log reports successful completion.
research_dir=absolutejs/research/certified-normal-ccd
rg -q 'Finished `release` profile' "$research_dir/native-build.log"
.cache/tools/wasm-bindgen-0.2.129-x86_64-unknown-linux-musl/wasm-bindgen --target web --out-dir .absolutejs/api .cache/target/wasm32-unknown-unknown/release/rapier_wasm3d.wasm
python3 - <<'PY'
from pathlib import Path
import json,hashlib
wasm=Path('.absolutejs/api/rapier_wasm3d_bg.wasm').read_bytes()
p=Path('absolutejs/native-kernel.json');d=json.loads(p.read_text());assert d['researchOnly'];d['wasmSha256']=hashlib.sha256(wasm).hexdigest();d['wasmBytes']=len(wasm);p.write_text(json.dumps(d,indent=2)+'\n')
Path('absolutejs/research/certified-normal-ccd/native-identity.json').write_text(json.dumps({'scope':'Private qualification identity, not release approval','native':d},indent=2)+'\n')
PY
bun run build:api > "$research_dir/api-build.log" 2>&1
bun test absolutejs/tests > "$research_dir/package-tests.log" 2>&1
npm pack --cache .cache/npm-pack --ignore-scripts --json --pack-destination .absolutejs/pack > "$research_dir/pack.json"
python3 absolutejs/scripts/audit-pack.py "$research_dir/pack.json" "$research_dir/pack-audit.json" --research
