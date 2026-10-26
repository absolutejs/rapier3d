# Rejected broad contact propagation

Candidate 14 links all active touching dynamic contacts reachable from accepted CCD impacts. Eight graph-helper tests pass, but the independent physical control fails: stopping one falling cuboid on a narrow floor incorrectly stops its frictionless side-by-side neighbor by 1.100100m. Candidate 13 passes all five controls. Sensor, positive-gap, solver-filter and kinematic exclusions pass in both.

Do not release or adopt. Contact adjacency alone is insufficient; relative normal displacement must justify coupling. The fixture and raw phase traces preserve this failure for regression testing.
