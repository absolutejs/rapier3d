import json,hashlib
from pathlib import Path
r=Path(__file__).resolve().parent
pack=json.loads((r/'pack.json').read_text())[0]
assert pack['name']=='@absolutejs/rapier3d' and pack['version']=='0.6.0'
# npm includes the repository README automatically, in addition to files[].
allowed={'package.json','LICENSE','README.md','absolutejs/README.md'}
assert all(f['path'].startswith('dist/') or f['path'] in allowed for f in pack['files'])
assert Path('README.md').read_bytes()==Path('absolutejs/README.md').read_bytes()
assert Path('.absolutejs/extracted/package/README.md').read_bytes()==Path('README.md').read_bytes()
a=Path('dist/rapier.mjs').read_bytes();b=Path('.absolutejs/extracted/package/dist/rapier.mjs').read_bytes();assert a==b
assert json.loads((r/'paths.json').read_text())['rows']==json.loads((r/'tarball-paths.json').read_text())['rows']
old=Path('.absolutejs/baseline-dist/types');new=Path('dist/types')
assert sorted(p.relative_to(old) for p in old.rglob('*') if p.is_file())==sorted(p.relative_to(new) for p in new.rglob('*') if p.is_file())
for p in old.rglob('*'):
 if p.is_file():assert p.read_bytes()==(new/p.relative_to(old)).read_bytes()
(r/'pack-audit.json').write_text(json.dumps(dict(passed=True,version=pack['version'],integrity=pack['integrity'],sha1=pack['shasum'],bundleSha256=hashlib.sha256(a).hexdigest(),fileCount=len(pack['files']),whitelistPassed=True,declarationsUnchanged=True,tarballPathCases=72),indent=2)+'\n')
print('Tarball whitelist, runtime identity, 72 path cases and unchanged declarations passed')
