# Sphere angular observations and full contact-refresh control

The probe now records sphere angular velocity and orientation alongside its previous geometry observations. `analyze.py` checks all positions, velocities, support rotations and geometric separations exactly against the prior saved runs: 8,568 matching frames across candidate 16 and rejected candidate 17. Both engines retain their prior native bytes; this is diagnostic instrumentation only. Source and engine hashes accompany every run. Type checking passed.

Candidate 16's maximum sphere angular speed is 0.001556rad/s; candidate 17's is 0.002447rad/s. Static and separating fixtures have zero spin. These measurements do not support large spurious sphere rotation as the explanation for the observed penetration. The plane-oracle counterexample describes an incomplete normal-transport proposal, not a demonstrated large-spin defect in the current engine.

The probe additionally permits 16 or 32 outer refreshes while keeping 32 configured solver subdivisions per recorded interval. `refresh-32.json` runs all 60 cases with one solver subdivision per world step. Broad-face forward-order peak depths in millimeters:

| Recorded rate | Angular speed | Baseline | Refresh every substep |
|---|---|---|---|
|60Hz|6rad/s|21.394|0.176|
|60Hz|30rad/s|98.179|3.943|
|240Hz|6rad/s|2.095|0.127|
|240Hz|30rad/s|82.581|1.021|
|960Hz|6rad/s|0.416|0.147|
|960Hz|30rad/s|9.139|0.889|

Static/path/native-query controls pass. These residuals remain above the configured 0.01mm allowed linear error; that setting is not an absolute physical error bound. The 960Hz slow case is not materially better than the earlier eight-refresh result (about 0.146mm). More refreshes do not monotonically guarantee convergence.

This is not a production recommendation. Outer stepping changes narrow-phase, warm-start and CCD scheduling as well as contact preparation. Timings are a single bounded CPU run, not a comparative benchmark. The existing chip/cavity transfer test already showed limited benefit from increased refresh; these sphere results do not supersede it. General rotating geometry remains unqualified.
