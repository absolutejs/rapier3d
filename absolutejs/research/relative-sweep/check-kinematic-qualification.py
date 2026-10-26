"""Assert the narrow kinematic gates; passing does NOT qualify the full solver."""
import json
import sys
from pathlib import Path
root = Path(sys.argv[1])
read = lambda name: json.loads((root / name).read_text())
kinematic = read('kinematic.json')
paths = read('path.json')
filters = read('kinematic-filter.json')
scales = read('scale.json')
world = read('world.json')
assert len(kinematic['cases']) == 12
for case in kinematic['cases']:
    assert len(case['frames']) == 3
    for frame in case['frames']:
        assert frame['endpointError'] < 1e-5, case
        if case['cap'] > 1:
            assert not frame['crossed'], case
assert len(paths['cases']) == 6
for case in paths['cases']:
    for frame in case['frames']:
        assert frame['endpointError'] < 1e-5 and frame['rotationError'] < 1e-5, case
assert len(filters['cases']) == 5 and filters['violations'] == 0
sensor = next(c for c in filters['cases'] if c['mode'] == 'sensor')
assert [e['started'] for e in sensor['events']] == [True, False]
assert len(scales['cases']) == 36 and scales['crossings'] == 0
assert scales['maxFrameError'] < 1e-5 and scales['maxOrderError'] < 1e-5
assert len(world['cases']) == 135 and world['crossings'] == 0 and world['energyGains'] == 0
for cap in ('4', '16'):
    assert world['maxFrameDifferenceByCap'][cap] < 1e-5
hashes = {result['engineSha256'] for result in (kinematic, paths, filters, scales)}
assert len(hashes) == 1, 'Mixed candidate artifacts'
print('Narrow kinematic gates pass: 12 crossing cases, 6 paths, 5 filters, 36 scale/order/frame cases, 135 dynamic controls.')
print('Not full solver acceptance: residual penetration, cap-one response, general rotation/shapes and bounded cost remain separate gates.')
