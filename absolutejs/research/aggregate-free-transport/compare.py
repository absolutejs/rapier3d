"""Pair native free-motion measurements and exact excluded-path state records."""
from pathlib import Path
import hashlib,json,math,re,sys
root=Path(__file__).resolve().parent
candidate=Path(sys.argv[1]) if len(sys.argv)>1 else root/'root-order-controls.log'
def read(path):
 text=path.read_text();assert 'test result: FAILED' not in text and 'error:' not in text
 free={};controls={}
 for m in re.finditer(r'AGGREGATE_FREE root=(\d+) scale=(\S+) hz=(\d+) substeps=(\d+) errors=(\[[^\n]+?\]) counts=(\[[^\n]+?\])',text):
  key=tuple(m.group(i) for i in range(1,5));values=json.loads(m[5]);assert len(values)==4 and all(math.isfinite(x) for x in values);free[key]=values
 for m in re.finditer(r'ASSEMBLY_CONTROL mode=(\S+) step=(\d+) bits=(\[[^\n]+\])',text):
  key=(m[1],m[2]);assert key not in controls;controls[key]=json.loads(m[3])
 assert len(free)==36 and len(controls)==386,(len(free),len(controls))
 return free,controls
a,ac=read(root/'baseline-expanded.log');b,bc=read(candidate)
assert a.keys()==b.keys() and ac==bc,'Excluded/rejected physical state changed'
assert all(b[k][i]<a[k][i] for k in a for i in range(4)), 'A free-case metric did not improve'
result={'scope':'private force-free fixed-assembly native experiment','baselineSource':'06b02e8c7220b779723e904e930c100901a1c253','freeCases':36,'excludedOrRejectedStates':386,'allExcludedPoseAndVelocityBitsIdentical':True,'allFreeMetricsImprove':True,'metrics':{name:{'baselineMaximum':max(v[i] for v in a.values()),'candidateMaximum':max(v[i] for v in b.values())} for i,name in enumerate(['relativeLinearMomentum','relativeAngularMomentum','relativeEnergy','comErrorDividedByScale'])},'baselineLogSha256':hashlib.sha256((root/'baseline-expanded.log').read_bytes()).hexdigest(),'candidateLogSha256':hashlib.sha256(candidate.read_bytes()).hexdigest(),'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
print(json.dumps(result,indent=2))
