# Prepared 0.18.0 release notes — qualification in progress

The native contact query now rejects an exactly duplicated CSO point before it
can form a degenerate tetrahedron. The captured tree/terrain query previously
lost a valid contact after that duplicate entered the simplex. An exact decimal
oracle and f32/f64 regressions cover the geometric correction.

Static and dynamic spring coefficients are selected directly in both supported
friction builders. The old arithmetic blend could make a fixed-body contact
change when only the unused dynamic coefficient changed, through cancellation.
A saved-world test compares complete poses and velocities for that isolation.

The additive JavaScript controls expose atomically validated owned
`contactSoftness` and `staticContactSoftness` pairs. Snapshots retain them.
Bounded physics profiles deduplicate settings into `contactSettings`; each
sample references a table index. This keeps the game within its existing event
size limit instead of repeating configuration in every sample.

Native defaults remain 30 Hz / 10 for dynamic contacts and 60 Hz / 10 for fixed
contacts. These are numerical stabilization parameters, not measured material
elasticity. The game separately proposes 600 Hz / 10 for its bounded rigid wood
simulation. All 24 tree/rate cases pass and sleep under that policy. At native
defaults, one previously accepted game case becomes rejected (-21.007 mm
sampled clearance), while the original missed-contact case is corrected.
The unchanged-default matrix is retained as a failure: this release must not be
represented as universally improving every trajectory at existing settings.

Completed qualification: 242 package tests, 847 game tests, four generated and
excavated terrain work requests, GPU-disabled browser controls, exact independent
builds and bounded paired CPU measurements. Ordinary CPU fixtures are within
roughly 1% of the published version in this run. Native serial/parallel and
no-std gates, final archive checks and publication remain pending. The source
and measured evidence live in the research branches until these gates finish.
