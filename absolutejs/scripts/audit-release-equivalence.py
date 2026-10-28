"""Prove release promotion changes only identity labels, packaging and documentation."""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile

parser = argparse.ArgumentParser()
parser.add_argument('candidate', type=Path)
parser.add_argument('release', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()

def read_archive(path):
    with tarfile.open(path) as archive:
        members = archive.getmembers()
        assert len({m.name for m in members}) == len(members), 'Duplicate archive path'
        assert all(m.isfile() or m.isdir() for m in members), 'Unexpected link or special entry'
        assert all(m.name.startswith('package/') for m in members), 'Unexpected archive prefix'
        return {m.name.removeprefix('package/'): archive.extractfile(m).read()
                for m in members if m.isfile()}

candidate, release = map(read_archive, [args.candidate, args.release])
assert candidate.keys() == release.keys(), 'Archive file set changed'
old_package, new_package = [json.loads(files['package.json']) for files in [candidate, release]]
assert old_package.get('private') is True and not new_package.get('private', False)
assert '-research.' in old_package['version'] and '-' not in new_package['version']
normalized = dict(old_package)
normalized.pop('private')
normalized['version'] = new_package['version']
assert normalized == new_package, 'Unexpected package manifest change'
old_info, new_info = [json.loads(files['dist/provenance.json']) for files in [candidate, release]]
identity = ['packageVersion', 'qualifiedKernelRelease']
normalized = dict(old_info)
for key in identity:
    normalized[key] = new_info[key]
assert normalized == new_info, 'Native provenance or non-identity metadata changed'
assert old_info['packageVersion'] == old_package['version']
assert new_info['packageVersion'] == new_package['version']
assert old_info['qualifiedKernelRelease'].startswith('unqualified-')
assert new_info['qualifiedKernelRelease'] == new_package['version']
for filename in ['dist/build-info.mjs', 'dist/rapier.mjs']:
    normalized = candidate[filename]
    for key in identity:
        before = (key + ':' + json.dumps(old_info[key])).encode()
        after = (key + ':' + json.dumps(new_info[key])).encode()
        assert normalized.count(before) == 1, f'Expected exactly one {key} in {filename}'
        normalized = normalized.replace(before, after)
    assert normalized == release[filename], f'Runtime changed beyond identity: {filename}'
allowed = {'package.json', 'README.md', 'absolutejs/README.md', 'dist/provenance.json',
           'dist/build-info.mjs', 'dist/rapier.mjs'}
changed = sorted(name for name in candidate if candidate[name] != release[name])
assert set(changed) <= allowed, f'Other runtime/declarations changed: {set(changed) - allowed}'
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
result = {
    'scope': 'qualified private archive versus public release archive',
    'files': len(candidate), 'changedFiles': changed,
    'runtimeDifferenceOnly': identity,
    'allOtherRuntimeAndDeclarationBytesIdentical': True,
    'documentationChanges': [name for name in changed if name.endswith('README.md')],
    'candidateSha256': sha(args.candidate), 'releaseSha256': sha(args.release),
    'auditSourceSha256': sha(Path(__file__)),
}
args.output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
