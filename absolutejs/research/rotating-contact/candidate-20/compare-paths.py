import json
from pathlib import Path
p=Path(__file__).resolve().parent
old=json.loads((p/'baseline-paths.json').read_text());new=json.loads((p/'paths.json').read_text());rows=[];unchanged=0
for a,b in zip(new['rows'],old['rows'],strict=True):
 key={k:a[k] for k in ['kind','budget','offset','omega']};assert key=={k:b[k] for k in key}
 if a['kind']!='velocity':
  assert a['frames']==b['frames'],key
  unchanged+=len(a['frames'])
 else:
  assert a['maxPositionErrorM']<3e-6,key
  assert a['maxRotationErrorRad']<2e-6,key
 rows.append(dict(**key,baselinePositionErrorM=b['maxPositionErrorM'],candidatePositionErrorM=a['maxPositionErrorM'],baselineRotationErrorRad=b['maxRotationErrorRad'],candidateRotationErrorRad=a['maxRotationErrorRad']))
(p/'path-comparison.json').write_text(json.dumps(dict(passed=True,unchangedControlFrames=unchanged,cases=rows),indent=2)+'\n')
print('Dynamic and position-driven frames unchanged:',unchanged,'; all velocity-driven paths satisfy 3um/2urad bounds')
