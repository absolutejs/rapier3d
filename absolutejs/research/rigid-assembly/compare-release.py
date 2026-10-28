"""Verify that release labeling/doc updates preserve the game-qualified runtime."""
from pathlib import Path
import hashlib, json, sys, tarfile

def read(path):
    with tarfile.open(path) as archive:
        files = {}
        for item in archive.getmembers():
            if item.isfile():
                assert item.name.startswith('package/')
                key = item.name.removeprefix('package/')
                assert key not in files
                files[key] = archive.extractfile(item).read()
        return files

candidate, release, output = map(Path, sys.argv[1:])
a, b = read(candidate), read(release)
assert a.keys() == b.keys() and len(a) == 53
old = json.loads(a['package.json']); new = json.loads(b['package.json'])
assert old['version'] == '0.14.0-assembly-research.0' and old.pop('private') is True
assert new['version'] == '0.14.1' and not new.get('private', False)
old['version'] = '0.14.1'
assert old == new
runtime = {'dist/rapier.mjs', 'dist/build-info.mjs', 'dist/provenance.json'}
docs = {'README.md', 'absolutejs/README.md'}
changed = []
for key in a:
    if a[key] == b[key]:
        continue
    changed.append(key)
    if key in runtime:
        normalized = a[key].replace(b'0.14.0-assembly-research.0', b'0.14.1').replace(b'UNQUALIFIED-private-root-origin', b'0.14.1')
        assert normalized == b[key], key
    else:
        assert key in docs | {'package.json'}, key
result = {'scope': 'game-qualified private archive versus public release archive',
          'files': len(a), 'changedFiles': sorted(changed),
          'runtimeDifferenceOnly': ['packageVersion', 'qualifiedKernelRelease'],
          'allOtherRuntimeAndDeclarationBytesIdentical': True,
          'documentationChanges': sorted(docs),
          'candidateSha256': hashlib.sha256(candidate.read_bytes()).hexdigest(),
          'releaseSha256': hashlib.sha256(release.read_bytes()).hexdigest(),
          'auditSourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
