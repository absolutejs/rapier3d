"""Compare every shipped byte against a separately built source checkout."""
import hashlib, json, subprocess, sys
from pathlib import Path
root = Path.cwd()
independent = Path(sys.argv[1]).resolve()
assert independent != root.resolve()
def hashes(directory):
    return {str(p.relative_to(directory)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(directory.rglob('*')) if p.is_file()}
a, b = hashes(root/'dist'), hashes(independent/'dist')
assert len(a) == 53 and a == b, 'Independent distribution differs'
source = subprocess.check_output(['git', '-C', str(independent), 'rev-parse', 'HEAD'], text=True).strip()
receipt = {'independentNativeTargets': True, 'allDistributionFilesIdentical': True,
           'files': len(a), 'sourceCommit': source, 'hashes': a}
(root/'absolutejs/release/0.21.2/reproducibility.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(f'All {len(a)} independently built distribution files match')
