from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent
base=json.loads((root.parent/'kinematic-precision/paths.json').read_text())
new=json.loads((root/'tarball-paths.json').read_text())
probe=root.parent/'kinematic-precision/path-probe.ts'
assert base['sourceSha256']==new['sourceSha256']==hashlib.sha256(probe.read_bytes()).hexdigest()
assert len(base['rows'])==len(new['rows'])==72
frames=0;changed_dynamic=0
for a,b in zip(base['rows'],new['rows']):
    assert all(a[k]==b[k] for k in ['kind','budget','offset','omega'])
    assert len(a['frames'])==len(b['frames'])==30
    if a['kind']!='dynamic':
        assert a==b;frames+=len(b['frames'])
    else:changed_dynamic+=sum(x!=y for x,y in zip(a['frames'],b['frames']))
result={'cases':72,'unchangedPrescribedFrames':frames,'changedDynamicFrames':changed_dynamic,'scope':'Prescribed velocity/position controls remain byte-identical to 0.6.0. Dynamic rounding is intentionally changed; this does not qualify contact physics.'}
(root/'path-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
