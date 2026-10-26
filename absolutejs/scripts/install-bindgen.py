"""Install the checksum-pinned binding generator in durable reproducible storage."""
from pathlib import Path
import hashlib, tarfile, urllib.request
root = Path(__file__).resolve().parents[2]
folder = root / '.cache/tools'
folder.mkdir(parents=True, exist_ok=True)
name = 'wasm-bindgen-0.2.129-x86_64-unknown-linux-musl'
archive = folder / (name + '.tar.gz')
expected = '82d12bb940e2d4e72e0d5605387fc1b8ca179044e012b620f0ce4e7440e8320e'
if not archive.exists():
    urllib.request.urlretrieve('https://github.com/wasm-bindgen/wasm-bindgen/releases/download/0.2.129/' + archive.name, archive)
if hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
    raise RuntimeError('Binding generator checksum mismatch')
with tarfile.open(archive) as bundle:
    bundle.extractall(folder, filter='data')
print(folder / name / 'wasm-bindgen')
