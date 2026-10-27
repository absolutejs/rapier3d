"""Separate contact error from unchanged motion and free-spin integration drift."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
load = lambda name: json.loads((root / (name + '.json')).read_text())
rows = []
unchanged_frames = 0
for feature in ['face', 'edge', 'corner']:
    baseline, candidate, control = [load(prefix + '-' + feature) for prefix in ['baseline', 'candidate', 'untagged']]
    assert all(len(run['rows']) == 48 for run in [baseline, candidate, control])
    assert baseline['sourceSha256'] == candidate['sourceSha256'] == control['sourceSha256']
    for old, new, untouched in zip(baseline['rows'], candidate['rows'], control['rows']):
        keys = ['span', 'hz', 'omega', 'reverse', 'steps']
        assert all(old[key] == new[key] == untouched[key] for key in keys)
        assert len(new['frames']) == new['steps']
        assert old['frames'] == untouched['frames'], 'Untagged dynamic motion changed'
        unchanged_frames += len(old['frames'])
        rows.append({**{key: old[key] for key in keys}, 'feature': feature,
                     'baselineDepthM': old['peakDepthM'], 'candidateDepthM': new['peakDepthM'],
                     'depthDeltaM': new['peakDepthM'] - old['peakDepthM'],
                     'baselineMomentumError': old['maxMomentumError'], 'candidateMomentumError': new['maxMomentumError'],
                     'baselineAngularMomentumError': old['maxAngularMomentumError'], 'candidateAngularMomentumError': new['maxAngularMomentumError'],
                     'baselineEnergyGain': old['maxEnergyGain'], 'candidateEnergyGain': new['maxEnergyGain'],
                     'speedCapConfounded': any(frame['speedCapConfounded'] for run in [old,new] for frame in run['frames'])})
free_before, free_after = load('baseline-separated'), load('candidate-separated')
assert len(free_before['rows']) == len(free_after['rows']) == 48
assert [row['frames'] for row in free_before['rows']] == [row['frames'] for row in free_after['rows']]
summary = {
    'physicalAcceptance': False, 'candidate': 21,
    'cases': len(rows), 'unchangedUntaggedFrames': unchanged_frames,
    'separatedFramesIdentical': True,
    'maximumBaselineDepthM': max(row['baselineDepthM'] for row in rows),
    'maximumCandidateDepthM': max(row['candidateDepthM'] for row in rows),
    'depthRegressionsOverOneMicrometer': [row for row in rows if row['depthDeltaM'] > 1e-6],
    'speedCapConfoundedCases': sum(row['speedCapConfounded'] for row in rows),
    'scope': 'Tagged centered sphere/box, friction/restitution/gravity/CCD disabled. Free-spin drift remains; conservation is not qualified.',
    'rows': rows,
}
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print({key: value for key, value in summary.items() if key not in ['rows', 'depthRegressionsOverOneMicrometer']})
print('Depth regressions >1 micrometer:', len(summary['depthRegressionsOverOneMicrometer']))
