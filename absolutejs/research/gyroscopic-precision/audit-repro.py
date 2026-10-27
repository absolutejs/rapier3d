"""Compare independently staged native builds before release."""
from pathlib import Path
import hashlib,json,sys,shutil
root=Path(__file__).resolve().parents[3];evidence=Path(__file__).resolve().parent
other=Path(sys.argv[1]).resolve();a=root/'.absolutejs/gyro-qualified/rapier_wasm3d_bg.wasm';b=other/'.absolutejs/repro/rapier_wasm3d_bg.wasm'
log=(other/'absolutejs/research/gyroscopic-precision/repro-native.log').read_text()
assert 'Finished `release` profile' in log and 'error:' not in log
first=a.read_bytes();second=b.read_bytes();assert first==second
assert b'/home/' not in first and b'/tmp/' not in first
manifest=json.loads((root/'absolutejs/native-kernel.json').read_text());digest=hashlib.sha256(first).hexdigest()
assert manifest['wasmSha256']==digest and manifest['wasmBytes']==len(first)
source_a={str(p.relative_to(root/'src')):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'src').rglob('*.rs')}
source_b={str(p.relative_to(other/'src')):hashlib.sha256(p.read_bytes()).hexdigest() for p in (other/'src').rglob('*.rs')}
assert source_a==source_b
shutil.copyfile(other/'absolutejs/research/gyroscopic-precision/repro-native.log',evidence/'repro-native.log')
result={'identical':True,'wasmSha256':digest,'wasmBytes':len(first),'rustSourceFiles':len(source_a),'firstCheckout':root.name,'secondCheckout':other.name,'sourceCommit':'7c4c8ed3dbb0d96e95829e039276ada2d291a861','localPathsAbsent':True}
(evidence/'repro.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
