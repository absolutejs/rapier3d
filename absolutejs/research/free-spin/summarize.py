"""Qualify the scope of the incremental gyro experiment without hiding regressions."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
before = json.loads((root / 'candidate-21.json').read_text())
after = json.loads((root / 'candidate-22.json').read_text())
assert len(before['rows']) == len(after['rows']) == 336
assert before['sourceSha256'] == after['sourceSha256']
assert before['referenceControls'] == after['referenceControls']
rows = []
for old, new in zip(before['rows'], after['rows']):
    keys = ['shape', 'hz', 'tilted', 'spin', 'budget', 'stepsCompleted']
    assert all(old[key] == new[key] for key in keys)
    assert old['stepsCompleted'] == old['hz'] // 10
    assert not old['speedCapConfounded'] and not new['speedCapConfounded']
    rows.append({**{key: old[key] for key in keys},
                 'beforeEnergyError': old['energyPeak']['relativeEnergyError'],
                 'afterEnergyError': new['energyPeak']['relativeEnergyError'],
                 'beforeAngularVelocityError': old['angularPeak']['angularVelocityError'],
                 'afterAngularVelocityError': new['angularPeak']['angularVelocityError']})
contact_rows = []
for feature in ['face', 'edge', 'corner']:
    old = json.loads((root.parent / 'rotating-contact/dynamic-pair' / ('candidate-' + feature + '.json')).read_text())
    new = json.loads((root / ('dynamic-' + feature + '.json')).read_text())
    assert len(old['rows']) == len(new['rows']) == 48
    for a, b in zip(old['rows'], new['rows']):
        keys = ['span', 'hz', 'omega', 'reverse', 'steps']
        assert all(a[key] == b[key] for key in keys)
        assert len(b['frames']) == b['steps']
        contact_rows.append({**{key: a[key] for key in keys}, 'feature': feature,
                             'beforeDepthM': a['peakDepthM'], 'afterDepthM': b['peakDepthM'],
                             'beforeAngularMomentumError': a['maxAngularMomentumError'], 'afterAngularMomentumError': b['maxAngularMomentumError'],
                             'beforeEnergyGain': a['maxEnergyGain'], 'afterEnergyGain': b['maxEnergyGain'],
                             'beforeRelativeEnergyGain': a['maxEnergyGain'] / a['initial']['energy'] if a['initial']['energy'] else 0,
                             'afterRelativeEnergyGain': b['maxEnergyGain'] / b['initial']['energy'] if b['initial']['energy'] else 0})
summary = {
    'physicalAcceptance': False, 'freeSpinCases': len(rows), 'taggedContactCases': len(contact_rows),
    'beforeMaxEnergyError': max(row['beforeEnergyError'] for row in rows),
    'afterMaxEnergyError': max(row['afterEnergyError'] for row in rows),
    'sphereMaxEnergyError': max(row['afterEnergyError'] for row in rows if row['shape'] == 'sphere'),
    'energyRegressionsOverOnePpm': [row for row in rows if row['afterEnergyError'] > row['beforeEnergyError'] + 1e-6],
    'angularRegressionsOverOneTenThousandthRadPerSecond': [row for row in rows if row['afterAngularVelocityError'] > row['beforeAngularVelocityError'] + 1e-4],
    'contactDepthRegressionsOverOneMicrometer': [row for row in contact_rows if row['afterDepthM'] > row['beforeDepthM'] + 1e-6],
    'maximumContactRelativeEnergyGainBefore': max(row['beforeRelativeEnergyGain'] for row in contact_rows),
    'maximumContactRelativeEnergyGainAfter': max(row['afterRelativeEnergyGain'] for row in contact_rows),
    'rows': rows, 'contactRows': contact_rows,
    'scope': 'Incremental gyroscopic update; genuine precession stays enabled. f32 drift, time discretization and contact error remain; tagged geometry remains private.'
}
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print({key: value for key, value in summary.items() if key not in ['rows', 'contactRows', 'energyRegressionsOverOnePpm', 'angularRegressionsOverOneTenThousandthRadPerSecond', 'contactDepthRegressionsOverOneMicrometer']})
print('Energy regressions >1 ppm:', len(summary['energyRegressionsOverOnePpm']))
print('Contact-depth regressions >1 micrometer:', len(summary['contactDepthRegressionsOverOneMicrometer']))
