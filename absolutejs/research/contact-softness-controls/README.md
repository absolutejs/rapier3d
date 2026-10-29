# Private contact softness controls

Adds atomic validated access to the native dynamic/static spring coefficients.
The initial API-only build keeps the solver unchanged; this candidate retains the
separately tested duplicate-CSO guard and its unresolved default-policy game
regression. No release is qualified. This is numerical contact regularization,
not a claim of measured wood/soil elasticity. The public legacy frequency
setter only sets dynamic softness; fixed-body softness was not configurable.

Native diagnostics show default static 60 Hz permits centimetre-scale transient
penetration in the saved state. 600 Hz reduces that to about one millimetre.
1 MHz nearly eliminates penetration but a full-fall tree fails to sleep, so it
is not adopted. Browser/WASM full-matrix qualification must precede any game
policy decision. No acceptance limit, recycling or clustering setting changes.

The first API run passes 241 tests and fails the new saved-world scope-isolation
test: changing dynamic coefficients slightly changes an exclusively fixed-body
collision. Native SIMD builders choose static coefficients with
`dynamic + mask * (static - dynamic)`, introducing cancellation dependence on
the unselected dynamic value. Both Coulomb and simplified builders now select
the appropriate coefficient directly. This is an additional native arithmetic
correction; defaults remain the same, but exact trajectories may change. The
failed API-only test log is retained as package-tests.log. New-build gates follow.

Direct selection passes all 242 package tests, including exact fixed-body
response independence from the dynamic coefficients. The first game telemetry
check rejected repeated settings in every sample (32,500 bytes for a bounded
two-attempt event, exceeding its 30,000-byte guard). The private .1 API instead
interns distinct settings in an owned bounded table, referenced by each sample.
Zero-frequency native diagnostic snapshots remain observable; new setter input
still requires positive frequency. Both intermediate failures are preserved.
Final .1 package tests: 242 pass, 87,474 assertions. Game telemetry checks now
pass without increasing the event budget. Its 24 actual tree/rate matrix passes
all cases and all trees sleep with the proposed 600 Hz static policy; worst
sampled clearance is about -1.03 mm. Four actual terrain requests also pass.
Full game tests and further native/browser/reproducibility gates are pending.
