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
