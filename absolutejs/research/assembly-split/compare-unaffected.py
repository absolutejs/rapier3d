"""Compare previous native controls with split-transition changes only."""
from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parent
baseline=root.parent/'aggregate-free-transport/gravity-lifecycle-candidate.log'
candidate=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/'full-native-candidate.log'
output=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else root/'unaffected-comparison.json'
a=baseline.read_text();b=candidate.read_text()
assert 'test result: ok.' in a and 'test result: ok.' in b
assert 'test result: FAILED' not in a+b
controls=lambda text:sorted(re.findall(r'ASSEMBLY_CONTROL mode=[^\n]+',text))
x,y=controls(a),controls(b);assert len(x)==len(y)==386 and x==y
measurements=lambda text:sorted(re.findall(r'AGGREGATE_(?:FREE |GRAVITY |GRAVITY_SWITCH |ROOT_ORDER |DETACH |TRAJECTORY )[^\n]+',text))
m,n=measurements(a),measurements(b)
assert len(m)==len(n) and len(m)>=118
assert m==n,'Existing physical measurements changed'
result={'excludedStateRecordsExactlyIdentical':386,'existingPhysicalMeasurementsExactlyIdentical':len(m),
        'baselineSha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),
        'candidateSha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),
        'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
