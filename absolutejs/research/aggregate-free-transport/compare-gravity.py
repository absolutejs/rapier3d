"""Independent native conservation/work measurements, not rendered FPS evidence."""
from pathlib import Path
import hashlib, json, math, re
root = Path(__file__).resolve().parent
paths = [root/'gravity-full-baseline.log', root/'gravity-lifecycle-candidate.log']

def read(path):
    text = path.read_text()
    assert 'test result: ok.' in text and 'test result: FAILED' not in text
    cases, switches = {}, {}
    for match in re.finditer(r'AGGREGATE_GRAVITY root=(\d+) scale=(\S+) hz=(\d+) substeps=(\d+) gravity_scale=(\S+) errors=(\[[^\n]+?\]) counts=(\[[^\n]+?\])', text):
        key = tuple(match[i] for i in range(1, 6))
        assert key not in cases
        errors = json.loads(match[6])
        assert len(errors) == 5 and all(math.isfinite(x) and x >= 0 for x in errors)
        cases[key] = errors
    for match in re.finditer(r'AGGREGATE_GRAVITY_SWITCH root=(\d+) errors=(\[[^\n]+?\])', text):
        assert match[1] not in switches
        switches[match[1]] = json.loads(match[2])
    assert len(cases) == 72 and len(switches) == 3
    return cases, switches

baseline, old_switch = read(paths[0])
candidate, new_switch = read(paths[1])
assert baseline.keys() == candidate.keys() and old_switch.keys() == new_switch.keys()
assert all(candidate[k][i] < baseline[k][i] for k in baseline for i in range(5))
assert all(new_switch[k][i] < old_switch[k][i] for k in old_switch for i in range(4))
assert all(x < 1e-4 for rows in (candidate, new_switch) for values in rows.values() for x in values)
print(json.dumps({
    'scope': 'private isolated fixed assemblies, uniform gravity only',
    'gravityCases': len(candidate), 'switchingCases': len(new_switch),
    'allMeasuredErrorsImprove': True,
    'linearConvention': 'native semi-implicit kick then drift, not exact continuous fall',
    'metrics': {name: {'baselineMaximum': max(v[i] for v in baseline.values()),
                       'candidateMaximum': max(v[i] for v in candidate.values())}
                for i, name in enumerate(['momentumErrorOverMassAndScale', 'relativeAngularMomentum',
                    'relativeSpinEnergy', 'comErrorOverScale', 'gravityWorkResidualOverInitialEnergy'])},
    'logs': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
    'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
}, indent=2))
