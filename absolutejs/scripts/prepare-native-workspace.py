"""Snapshot native inputs under one Cargo root without modifying canonical sources.

Cargo hashes absolute paths for path dependencies outside its workspace. The
upstream bindings workspace has that shape. This runtime-only build workspace
keeps both crates inside its root and preserves source bytes and locked versions.
"""
import hashlib
import json
from pathlib import Path
import tomllib

root = Path(__file__).resolve().parents[2]
inputs = {}
for directory in ['src', 'bindings/typescript/src']:
    for path in sorted((root / directory).rglob('*')):
        if path.is_file():
            inputs[str(path.relative_to(root))] = path.read_bytes()
for name in ['Cargo.toml', 'crates/rapier3d/Cargo.toml',
             'bindings/typescript/Cargo.toml', 'bindings/typescript/Cargo.lock',
             'bindings/typescript/builds/hello-wasm/Cargo.toml', 'README.md']:
    inputs[name] = (root / name).read_bytes()

original = inputs['Cargo.toml'].decode()
bindings = inputs['bindings/typescript/Cargo.toml'].decode()
manifest = ('[workspace]\nmembers = ["bindings/typescript/builds/hello-wasm"]\nexclude = ["crates/rapier3d"]\nresolver = "2"\n\n'
            + bindings[bindings.index('[profile.release]'):bindings.index('[patch.crates-io]')]
            + '[patch.crates-io]\nrapier3d = { path = "crates/rapier3d" }\n')
engine = inputs['crates/rapier3d/Cargo.toml'].decode()
# Keep the engine a dependency, not a workspace member: Cargo otherwise resolves
# its inactive optional/dev dependencies as additional workspace lock inputs.
# Inline inherited manifest values without changing the effective dependency set.
workspace = tomllib.loads(original)['workspace']
runtime = tomllib.loads(engine)
runtime.pop('dev-dependencies', None)
for key, value in list(runtime['package'].items()):
    if isinstance(value, dict) and value == {'workspace': True}:
        runtime['package'][key] = workspace['package'][key]

def inherit_dependencies(table):
    for key, value in list(table.get('dependencies', {}).items()):
        if isinstance(value, dict) and value.get('workspace'):
            inherited = workspace['dependencies'][key]
            resolved = {'version': inherited} if isinstance(inherited, str) else dict(inherited)
            for option, setting in value.items():
                if option == 'workspace':
                    continue
                if option == 'features':
                    resolved[option] = list(dict.fromkeys(resolved.get(option, []) + setting))
                else:
                    resolved[option] = setting
            table['dependencies'][key] = resolved

inherit_dependencies(runtime)
for target in runtime.get('target', {}).values():
    inherit_dependencies(target)

def toml_value(value):
    if isinstance(value, dict):
        return '{ ' + ', '.join(json.dumps(k) + ' = ' + toml_value(v) for k, v in value.items()) + ' }'
    if isinstance(value, list):
        return '[' + ', '.join(toml_value(v) for v in value) + ']'
    return json.dumps(value)

runtime_engine = '\n'.join(json.dumps(key) + ' = ' + toml_value(value) for key, value in runtime.items()) + '\n'
assert tomllib.loads(runtime_engine) == runtime
lock = inputs['bindings/typescript/Cargo.lock'].decode().split('[[patch.unused]]')[0]
assert tomllib.loads(lock)['package'] == tomllib.loads(inputs['bindings/typescript/Cargo.lock'].decode())['package']
outputs = {name: data for name, data in inputs.items()
           if name.startswith('src/') or name.startswith('bindings/typescript/src/')}
outputs.update({
    'Cargo.toml': manifest.encode(),
    'Cargo.lock': lock.encode(),
    'crates/rapier3d/Cargo.toml': runtime_engine.encode(),
    'bindings/typescript/builds/hello-wasm/Cargo.toml': inputs['bindings/typescript/builds/hello-wasm/Cargo.toml'],
    'README.md': inputs['README.md'],
})
hashes = {name: hashlib.sha256(data).hexdigest() for name, data in sorted(outputs.items())}
digest = hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()
destination = root / '.absolutejs/native-source' / digest
destination.mkdir(parents=True, exist_ok=True)
unexpected = {str(p.relative_to(destination)) for p in destination.rglob('*') if p.is_file()} - set(outputs) - {'source-manifest.json'}
if unexpected:
    raise SystemExit('Unexpected files in generated native workspace: ' + ', '.join(sorted(unexpected)))
for name, data in outputs.items():
    path = destination / name
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)
(destination / 'source-manifest.json').write_text(json.dumps({
    'schemaVersion': 1, 'contentSha256': digest, 'outputs': hashes,
    'inputs': {name: hashlib.sha256(data).hexdigest() for name, data in sorted(inputs.items())},
    'rustSourceBytesUnchanged': True,
    'lockedPackageVersionsUnchanged': True,
}, indent=2) + '\n')
print(destination)
