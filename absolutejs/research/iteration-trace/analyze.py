"""Summarize read-only native trace; never infer a safe stopping rule from residual alone."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent
source=json.loads((root/'results.json').read_text())
summaries=[]
for record in source['rows']:
    for phase in sorted(set(row[0] for row in record['trace'])):
        rows=[row for row in record['trace'] if row[0]==phase]
        last_velocity_change=max((i for i,row in enumerate(rows) if row[3]!=0),default=-1)
        tail=rows[last_velocity_change+1:]
        summaries.append({
            'mass':record['mass'],'friction':record['friction'],'reverse':record['reverse'],'step':record['step'],'phase':phase,
            'observedSweeps':len(rows),'droppedRows':record['dropped'],'terminalObservedResidual':rows[-1][2],
            'numericallyFrozenVelocityTailFromSweep':tail[0][1] if tail else None,
            'numericallyFrozenVelocityTailSweeps':len(tail),
            'preciseImpulsesStillChangeInVelocityTail':any(row[4]!=0 for row in tail),
            'storedImpulsesStillChangeInVelocityTail':any(row[5]!=0 for row in tail),
            'maximumStoredImpulseChangeInVelocityTail':max((row[5] for row in tail),default=0),
            'convergence':record['convergence']})
result={'scope':'Numerical deltas, not signed-zero bitwise equivalence. Bounded trace may omit later phases. No stopping policy is proven.', 'snapshotComparisons':source['snapshotComparisons'],'profiledAndUnprofiledExact':source['profiledAndUnprofiledExact'],'summaries':summaries}
(root/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
for row in summaries:
    if row['mass']==20 and row['friction']==0:print(json.dumps(row))
