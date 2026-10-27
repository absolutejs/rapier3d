"""Fail closed on mislabeled experiment settings before comparing physical results."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parent
policies=[('tagged',32,False),('no-ccd',32,True),('substeps-64',64,False),('substeps-128',128,False),('no-ccd-128',128,True)]
def validate(d,budget,no_ccd):
 if not (d['boxOracle'] is True and d['solverSubdivisionsPerOuterInterval']==budget and d.get('noCcd',False)==no_ccd and d.get('commonBoost',False) is False and d.get('startFeature','face')=='face' and d.get('rotationAxis','z')=='z' and len(d['cases'])==60):
  raise ValueError('Policy metadata does not match the labeled experiment')
rows=[];hashes={};engine=None
for name,budget,no_ccd in policies:
 path=root/(name+'.json');d=json.loads(path.read_text());validate(d,budget,no_ccd)
 if engine is None:engine=d['engineSha256']
 assert engine==d['engineSha256']
 hashes[path.name]=hashlib.sha256(path.read_bytes()).hexdigest()
 for c in d['cases']:
  rows.append(dict(policy=name,solverBudget=budget,fullCcd=not no_ccd,**{k:c[k] for k in ['span','hz','omega','reverse']},peakDepthM=max(0,-c['peak']['separation'])))
# Negative control: exactly the omitted-CLI-flag mistake this checker must catch.
bad=json.loads((root/'no-ccd.json').read_text());bad['noCcd']=False
try:validate(bad,32,True)
except ValueError:negative=True
else:raise AssertionError('Mislabeled no-CCD control was accepted')
result=dict(physicalAcceptance=False,negativeMetadataControlPassed=negative,caseCount=len(rows),inputHashes=hashes,cases=rows,
 scope='Configured solver substeps per CCD pass, not constant total actual work: CCD scheduling can create multiple passes. Disabling full CCD changes planning as well as endpoint clamping. This matrix does not isolate clamping by itself; phase traces do.')
(root/'policy-summary.json').write_text(json.dumps(result,indent=2)+'\n')
print('Validated policy labels and engine identity for',len(rows),'cases; mislabeled negative control rejected')
