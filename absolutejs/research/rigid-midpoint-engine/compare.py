"""Compare synthetic native controls; no gameplay telemetry or GPU workload."""
from pathlib import Path
import hashlib, json, re, sys
root=Path(__file__).resolve().parent
candidate=Path(sys.argv[1]) if len(sys.argv)>1 else root/'serial-final.log'
baseline=root.parent/'rigid-midpoint-engine-baseline/control-matrix.log'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):
    text=p.read_text()
    assert 'test result: FAILED' not in text and 'error:' not in text
    free={}
    controls={}
    for line in text.splitlines():
        # libtest may print its test-name prefix on the first captured line.
        match=re.search(r'(CONTROL mode=|FREE case=)',line)
        if match: line=line[match.start():]
        if line.startswith('CONTROL '):
            key,bits=line.split(' bits='); controls[key]=bits
        if line.startswith('FREE case='):
            m=re.fullmatch(r'FREE case=(\d+) scale=(\S+) hz=(\d+) substeps=(\d+) tilted=(\w+) energy=(\S+) momentum=(\S+) counts=(.*)',line)
            assert m,line
            free[m[1]]={'energy':float(m[6]),'momentum':float(m[7]),'fixture':list(m.group(2,3,4,5))}
    assert len(free)==96 and len(controls)==542,(len(free),len(controls))
    return free,controls
x,xc=read(candidate); y,yc=read(baseline)
assert xc==yc,'Excluded/rejected control motion changed'
assert all(x[k]['fixture']==y[k]['fixture'] for k in x)
result={'schemaVersion':1,'scope':'private native torque-free experiment; not a released engine',
 'candidateLog':str(candidate),'candidateLogSha256':digest(candidate),'baselineLogSha256':digest(baseline),
 'baselineSource':'65d37204d0e8e662389b77c5720e24c3a2108c57','freeCases':96,
 'excludedOrRejectedControlStates':542,'controlPoseAndVelocityBitsIdentical':True,
 'metrics':{field:{'baselineMaximum':max(r[field] for r in y.values()),
                  'candidateMaximum':max(r[field] for r in x.values()),
                  'improvedBeyond1eMinus8':sum(x[k][field]<y[k][field]-1e-8 for k in x),
                  'worsenedBeyond1eMinus8':sum(x[k][field]>y[k][field]+1e-8 for k in x)} for field in ['energy','momentum']},
 'limitations':['ordinary free rigid bodies only','no constrained rotation correction',
                'nonphysical stored moments rejected, not repaired','no WASM or game qualification from this harness']}
print(json.dumps(result,indent=2))
