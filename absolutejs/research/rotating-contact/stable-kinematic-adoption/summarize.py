"""Compare prescribed-motion releases without mistaking them for contact fixes."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
before = json.loads((root / 'stable-0.5.json').read_text())
after = json.loads((root / 'stable-0.6.json').read_text())
assert len(before['cases']) == len(after['cases']) == 60
assert before['sourceSha256'] == after['sourceSha256']
for key in ['noCcd', 'commonBoost', 'rotationAxis', 'startFeature', 'boxOracle',
            'planeOracle', 'solverSubdivisionsPerOuterInterval', 'queryFresh']:
    assert before[key] == after[key]
rows = []
for old, new in zip(before['cases'], after['cases']):
    keys = ['span', 'hz', 'omega', 'reverse']
    assert all(old[key] == new[key] for key in keys)
    assert len(old['frames']) == len(new['frames']) == old['steps'] == new['steps']
    assert old['steps'] > 0
    old_depth = max(0, -old['peak']['separation'])
    new_depth = max(0, -new['peak']['separation'])
    rows.append({**{key: old[key] for key in keys},
                 'beforeDepthM': old_depth, 'afterDepthM': new_depth,
                 'depthDeltaM': new_depth - old_depth,
                 'staticFramesIdentical': old['frames'] == new['frames'] if old['omega'] == 0 else None})
summary = {
    'physicalAcceptance': False, 'cases': len(rows),
    'baselineEngine': before['engineSha256'], 'candidateEngine': after['engineSha256'],
    'staticControlsIdentical': all(row['staticFramesIdentical'] for row in rows if row['omega'] == 0),
    'maximumDepthRegressionM': max(row['depthDeltaM'] for row in rows),
    'maximumDepthImprovementM': max(-row['depthDeltaM'] for row in rows),
    'rows': rows,
}
assert summary['staticControlsIdentical']
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print('60 cases complete; static trajectories identical; moving-contact limits remain explicit')
