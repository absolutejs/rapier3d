"""Validate exact cross-target snapshot reads and reject malformed envelopes."""
from pathlib import Path
import hashlib,json,subprocess,tempfile
root=Path(__file__).resolve().parent
binary=root/'target/debug/absolutejs-sleep-snapshot-inspector'
observations=root/'observations'
checks=[]
for report in sorted(observations.glob('*.json')):
 value=json.loads(report.read_text());source=Path(value['snapshot']);before=source.read_bytes()
 run=subprocess.run([str(binary),str(source)],capture_output=True,text=True,timeout=10)
 assert run.returncode==0,(report,run.stderr)
 assert json.loads(run.stdout)==value,report
 assert source.read_bytes()==before
 assert value['exactSerializationRoundTrip'] and len(value['dynamicBodies'])==2
 expected_sleep=[True,True] if report.name=='1920-6-slender-3-0-continued.json' else [False,True]
 assert [b['activation']['sleeping'] for b in value['dynamicBodies']]==expected_sleep
 checks.append({'report':report.name,'snapshotSha256':hashlib.sha256(before).hexdigest(),'sleeping':expected_sleep})
assert len(checks)==6
# Disposable files contain derived malformed envelopes, not unique evidence.
with tempfile.TemporaryDirectory(dir=root) as directory:
 for name,payload in [('magic',b'bad'),('version',b'ABSJS3DS'+(2).to_bytes(4,'little')),('truncated',b'ABSJS3DS'+(1).to_bytes(4,'little')+b'\0')]:
  file=Path(directory)/name;file.write_bytes(payload)
  run=subprocess.run([str(binary),str(file)],capture_output=True,text=True,timeout=10)
  assert run.returncode!=0 and not run.stdout,(name,run.stdout)
  checks.append({'control':name,'rejected':True,'stderr':run.stderr.strip()})
result={'readOnly':True,'checks':checks,'binarySha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'sourceHashes':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [root/'Cargo.toml',root/'Cargo.lock',root/'src/main.rs',Path(__file__)]}}
(root/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print('6 exact captured reads; 3 malformed envelope controls rejected')
