"""Audit every packaged distribution byte and the lightweight entry."""
from pathlib import Path
import hashlib,json,tarfile
root=Path(__file__).resolve().parents[3];receipt=Path(__file__).resolve().parent
pack=json.loads((receipt/'pack.json').read_text())[0];archive=root/'.absolutejs/pack'/pack['filename']
expected={str(p.relative_to(root/'dist')):p for p in (root/'dist').rglob('*') if p.is_file()}
with tarfile.open(archive) as t:
    files={p.name:p for p in t.getmembers() if p.isfile()}
    for name,p in expected.items():assert t.extractfile(files['package/dist/'+name]).read()==p.read_bytes(),name
    assert all(n in ['package/package.json','package/LICENSE','package/absolutejs/README.md','package/README.md'] or n.startswith('package/dist/') for n in files)
    pkg=json.load(t.extractfile('package/package.json'));assert pkg['version']=='0.7.0'
    assert pkg['exports']['./build-info']['import']=='./dist/build-info.mjs'
    assert len(t.extractfile('package/dist/build-info.mjs').read())<2048
result={'version':pkg['version'],'distributionFiles':len(expected),'tarballSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'integrity':pack['integrity'],'wasm':json.loads((root/'absolutejs/native-kernel.json').read_text())}
(receipt/'tarball-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
