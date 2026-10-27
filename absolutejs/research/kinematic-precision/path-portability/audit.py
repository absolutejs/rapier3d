"""Require actual cross-checkout WASM identity, not just matching compiler flags."""
import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit('Expected first WASM, second WASM, output receipt')
paths = [Path(p).resolve() for p in sys.argv[1:3]]
if paths[0] == paths[1]:
    raise SystemExit('Independent artifact paths required')
artifacts = [p.read_bytes() for p in paths]
for blob in artifacts:
    assert blob[:8] == b'\0asm\x01\0\0\0', 'Invalid WASM artifact'
    for forbidden in [b'/home/alexkahn', b'rapier-kinematic-release', b'rapier-kinematic-repro']:
        assert forbidden not in blob, f'Local source path remains: {forbidden!r}'
assert artifacts[0] == artifacts[1], 'Separate checkout builds differ'
Path(sys.argv[3]).write_text(json.dumps({
    'passed': True,
    'scope': 'Two pinned-toolchain checkout builds; not a cross-toolchain guarantee',
    'artifacts': [{'path': str(p), 'bytes': len(blob),
                   'sha256': hashlib.sha256(blob).hexdigest()}
                  for p, blob in zip(paths, artifacts)],
    'localPathLeakage': False,
    'byteIdentical': True,
}, indent=2) + '\n')
print('Independent checkout WASM artifacts match with no local path leakage')
