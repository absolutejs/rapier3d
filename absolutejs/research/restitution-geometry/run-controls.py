"""Bounded comparison against checked-in published-engine controls; CPU only."""
import hashlib, json, os, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[3]
game = root.parent / "hello-world"
source = game / "docs/articulated-drift-2026-10-27/restitution-qualified"
out = Path(__file__).resolve().parent / "controls"
out.mkdir()
engine = root / "dist/rapier.mjs"
engine_hash = hashlib.sha256(engine.read_bytes()).hexdigest()
rows = []
for fixture in sorted(source.glob("*.json")):
    value = json.loads(fixture.read_text())
    if not isinstance(value, dict) or "mode" not in value:
        continue
    target = out / fixture.stem
    with (out / (fixture.stem + ".log")).open("w") as log:
        subprocess.run(["bun", "scripts/probe-articulated-impact.ts", str(target), str(fixture)],
            cwd=game, env={**os.environ, "IMPACT_ENGINE": str(engine)}, stdout=log, stderr=subprocess.STDOUT, check=True)
    result = json.loads((target / "results.json").read_text())
    assert len(result) == 1
    baseline = json.loads((source / fixture.stem / "results.json").read_text())[0]
    row = result[0]
    for key, requested in value.items():
        assert row[key] == requested, (key, row[key], requested)
    rows.append({"fixture": value, "candidate": row, "published": baseline})
    print(fixture.stem, row["maxAngularError"], row["maxEnergyGain"], flush=True)
assert len(rows) == 24, len(rows)
assert hashlib.sha256(engine.read_bytes()).hexdigest() == engine_hash
(out / "comparison.json").write_text(json.dumps(rows, indent=2) + "\n")
(out / "complete.json").write_text(json.dumps({"cases": len(rows), "engineSha256": engine_hash}) + "\n")
