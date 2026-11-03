"""Run unchanged runtime test bodies with explicit candidate imports; no preload alias."""
from pathlib import Path
import subprocess, json, hashlib
root = Path.cwd()
out = root / '.absolutejs/terrain-sweep-tests'
out.mkdir(parents=True, exist_ok=True)
candidate = root / 'absolutejs/research/terrain-sweep/dist/rapier.mjs'
sources = {}
for p in sorted((root/'absolutejs/tests').rglob('*')):
    if not p.is_file(): continue
    if p.suffix != '.ts':
        dest=out/p.relative_to(root/'absolutejs/tests')
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(p.read_bytes())
        continue
    text = p.read_text()
    sources[str(p.relative_to(root))] = hashlib.sha256(p.read_bytes()).hexdigest()
    # Preserve fixture URLs at their real original location in the canonical tests.
    text = text.replace('import.meta.url', json.dumps(p.as_uri()))
    for quote in ['"', "'"]:
        text=text.replace(quote+'../research/', quote+str(root/'absolutejs/research')+'/')
    for name in ['@absolutejs/rapier3d', '../../dist/rapier.mjs']:
        for quote in ['"', "'"]:
            text = text.replace(quote+name+quote, quote+str(candidate)+quote)
    dest = out/p.relative_to(root/'absolutejs/tests')
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(text)
files = sorted(str(p) for p in out.glob('*.test.ts') if p.name != 'build-info.test.ts')
result = subprocess.run(['timeout','--kill-after=5s','180s','nice','-n','10','bun','test',*files])
(root/'absolutejs/research/terrain-sweep/test-source-audit.json').write_text(json.dumps({
    'candidateBundleSha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),
    'sourceHashes':sources,'excluded':['build-info.test.ts: research identity intentionally differs'],
    'transform':'Only explicit candidate import paths and original fixture URLs; runtime test bodies unchanged',
    'exitCode':result.returncode
},indent=2)+'\n')
raise SystemExit(result.returncode)
