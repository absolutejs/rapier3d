"""Exercise deterministic source snapshots and reject stale build inputs."""
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
command = ['python3', str(root / 'absolutejs/scripts/prepare-native-workspace.py')]
first = subprocess.check_output(command, text=True).strip()
assert subprocess.check_output(command, text=True).strip() == first
sentinel = Path(first) / 'unexpected-qualification-control.txt'
assert not sentinel.exists(), 'Refusing to overwrite an existing control file'
sentinel.write_text('negative control\n')
try:
    result = subprocess.run(command, capture_output=True, text=True)
    assert result.returncode != 0 and 'Unexpected files' in result.stderr
finally:
    sentinel.unlink()
assert subprocess.check_output(command, text=True).strip() == first
print('Stable source snapshot and unexpected-file rejection passed')
