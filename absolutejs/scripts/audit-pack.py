"""Verify the exact publish archive, native payload and lightweight identity."""
import argparse,base64,hashlib,json,tarfile
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('receipt',type=Path)
parser.add_argument('output',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
receipts=json.loads(args.receipt.read_text())
assert len(receipts)==1,'Expected one package receipt'
pack=receipts[0]
assert Path(pack['filename']).name==pack['filename'],'Archive must be a basename'
archive=root/'.absolutejs/pack'/pack['filename']
payload=archive.read_bytes()
assert hashlib.sha1(payload).hexdigest()==pack['shasum']
integrity='sha512-'+base64.b64encode(hashlib.sha512(payload).digest()).decode()
assert integrity==pack['integrity']
expected={str(p.relative_to(root/'dist')):p.read_bytes() for p in (root/'dist').rglob('*') if p.is_file()}
manifest=json.loads((root/'package.json').read_text())
assert manifest['name']=='@absolutejs/rapier3d' and not manifest.get('private',False)
native=(root/'.absolutejs/api/rapier_wasm3d_bg.wasm').read_bytes()
qualification=json.loads((root/'absolutejs/native-kernel.json').read_text())
assert hashlib.sha256(native).hexdigest()==qualification['wasmSha256']
assert len(native)==qualification['wasmBytes']
with tarfile.open(archive) as tar:
    members=tar.getmembers()
    assert len({m.name for m in members})==len(members),'Duplicate archive path'
    assert all(m.isfile() or m.isdir() for m in members),'Links and special entries are forbidden'
    files={m.name:m for m in members if m.isfile()}
    allowed={'package/package.json','package/LICENSE','package/absolutejs/README.md','package/README.md'}|{'package/dist/'+n for n in expected}
    assert set(files)==allowed,{'unexpected':sorted(set(files)-allowed),'missing':sorted(allowed-set(files))}
    for name,data in expected.items():
        assert tar.extractfile(files['package/dist/'+name]).read()==data,name
    pkg=json.load(tar.extractfile('package/package.json'))
    assert pkg['name']==manifest['name'] and pkg['version']==manifest['version']
    assert not pkg.get('private',False)
    assert pkg['exports']==manifest['exports']
    assert pkg['exports']['./build-info']['import']=='./dist/build-info.mjs'
    assert len(expected['build-info.mjs'])<2048
    assert base64.b64encode(native) in expected['rapier.mjs'],'Runtime must embed the audited native bytes'
    assert tar.extractfile('package/README.md').read()==(root/'absolutejs/README.md').read_bytes()
    assert tar.extractfile('package/absolutejs/README.md').read()==(root/'absolutejs/README.md').read_bytes()
    provenance=json.loads(expected['provenance.json'])
    assert provenance['wasmSha256']==qualification['wasmSha256']
    assert provenance['wasmBytes']==len(native)
    assert provenance['packageVersion']==pkg['version']
result={'name':pkg['name'],'version':pkg['version'],'distributionFiles':len(expected),'tarballSha256':hashlib.sha256(payload).hexdigest(),'shasum':pack['shasum'],'integrity':integrity,'embeddedNativeVerified':True,'allDistributionBytesVerified':True,'provenance':provenance}
args.output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
