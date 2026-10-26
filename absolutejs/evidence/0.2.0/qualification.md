# Rapier 0.2.0 qualification

The release adds current-pose solver anchor queries and exposes existing clustering
and minimum CCD substep controls. Engine algorithms and defaults remain unchanged.
Source base and embedded WASM checksum are recorded in provenance.json.

Validation: 9 tests, 39,606 assertions, exact default-motion parity against official
0.21.0 at 960/1920 Hz in two poses; strict TypeScript consumer; GPU-disabled browser
worker with 24 clustered contacts, live anchors and control setters. Invalid indices,
callback lifetimes, nested queries and snapshot control persistence are covered.
The packaged artifact includes embedded WASM and ESM/types; see pack.json.

## Independent geometric and energy observations

The audit uses a 20 mm cube in a 40 mm hollow shell with exact analytic masses and
inertia, a two-metre fall, two seconds of simulation, four CCD substeps and 32 extra
solver iterations. Corner-to-cavity distance is independently measured after every
outer step. Internal CCD substeps are not sampled. All sixteen cases sleep by the end.
Default minCcdDt is 1/6000 second; the alternative is outer timestep / 100.

| Clustering | Hz | Tilt rad | Default corner mm | Scaled CCD corner mm | Default energy gain mJ | Scaled energy gain mJ |
| --- | --- | --- | --- | --- | --- | --- |
| True | 960 | 0 | 0.458697 | 0.092154 | 0.000000 | 0.000000 |
| True | 960 | 0.3 | 0.031012 | 0.051810 | 0.000000 | 0.000000 |
| True | 1920 | 0 | 0.456692 | 0.101779 | 0.531317 | 0.397354 |
| True | 1920 | 0.3 | 0.019627 | 0.008396 | 0.394916 | 0.394916 |
| False | 960 | 0 | 0.468488 | 0.091664 | 0.000000 | 0.000000 |
| False | 960 | 0.3 | 0.028383 | 0.028383 | 0.000000 | 0.000000 |
| False | 1920 | 0 | 0.459523 | 0.099547 | 0.531317 | 0.397354 |
| False | 1920 | 0.3 | 0.007651 | 0.007651 | 0.394916 | 0.394916 |

Initial mechanical energy is 0.753408 J. Energy includes translational and rotational
kinetic plus gravitational potential energy; contact elastic energy is not included.
The maximum excess is about 0.071% with the default and 0.053% with scaled CCD. These
are sampled observations, not energy-conservation or trajectory qualification.
Clustering off does not eliminate the axis-aligned impact overlap. Scaled CCD reduces
that overlap but worsens the clustered 960 Hz angled case; no game default is changed.
Live anchor separation closely follows independent corners in this fixture. It is
not a universal material penetration bound: anchors include skin/hook offsets and
the projected normal is cached from the contact update.

## Harness failures retained

A concurrent run hit Bun's default five-second test timeout. Parity fixtures now
have a 15-second test timeout and a ten-second internal wall-time guard. The sequential
rerun passed without changing numerical assertions. The expanded energy audit hit
its former 45-second aggregate wall limit; the rerun is bounded at 15 seconds per
case and 120 seconds overall. Both failure logs are retained here.
During energy-harness inspection, initial body.mass() was found to be zero before
Rapier's first mass update. Energy now uses the fixture's explicit analytic masses
and inertia at every sample, including the initial state. JSON evidence was regenerated
with that correction. No simulation setting was changed to accommodate measurement.

Full machine-readable matrices live in ../live-shell-distances.json and
../live-shell-scaled-ccd.json. Tree-component qualification is the next independent
step after registry adoption; these analytic results do not enable combined-chip motion.
