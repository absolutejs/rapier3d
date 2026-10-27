"""Compare a registry installation with the exact qualified publication archive.

Reads archive entries without extracting them. No package code is executed.
"""
import argparse
import hashlib
import json
import tarfile
from pathlib import Path, PurePosixPath

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("archive", type=Path)
parser.add_argument("receipt", type=Path)
parser.add_argument("installed", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
receipt = json.loads(args.receipt.read_text())
archive_hash = hashlib.sha256(args.archive.read_bytes()).hexdigest()
if archive_hash != receipt["tarballSha256"]:
    raise SystemExit("Archive does not match qualified receipt")
root = args.installed.resolve(strict=True)
matched = {}
with tarfile.open(args.archive) as archive:
    for entry in archive.getmembers():
        path = PurePosixPath(entry.name)
        if path.is_absolute() or ".." in path.parts or path.parts[0] != "package":
            raise SystemExit("Unsafe archive path")
        if entry.isdir():
            continue
        if not entry.isfile():
            raise SystemExit("Archive contains a link or special entry")
        relative = Path(*path.parts[1:])
        name = relative.as_posix()
        if name in matched:
            raise SystemExit("Duplicate archive path")
        installed = (root / relative).resolve(strict=True)
        if not installed.is_relative_to(root):
            raise SystemExit("Installed file resolves outside package")
        expected = archive.extractfile(entry).read()
        if installed.read_bytes() != expected:
            raise SystemExit(f"Installed file differs from qualified archive: {name}")
        matched[name] = hashlib.sha256(expected).hexdigest()
manifest = json.loads((root / "package.json").read_text())
if manifest["name"] != receipt["name"] or manifest["version"] != receipt["version"]:
    raise SystemExit("Installed package identity differs from receipt")
result = {
    "package": manifest["name"],
    "version": manifest["version"],
    "archiveSha256": archive_hash,
    "allPackagedFilesMatch": True,
    "files": matched,
}
args.output.write_text(json.dumps(result, indent=2) + "\n")
print(f"Verified {len(matched)} installed files against qualified archive")
