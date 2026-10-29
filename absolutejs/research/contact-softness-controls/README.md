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

The selected .1 game integration now passes all 847 game tests (7,408,759
assertions), physics-tool type checks, dependency resolution and the browser
worker build. A GPU-disabled Chromium worker verifies the new controls are
owned and atomic, survive snapshot restoration, and retain two distinct settings
for three samples through the bounded settings table. This is CPU/browser API
qualification, not a hardware rendering or FPS result. Native feature gates,
independent output equivalence and paired CPU measurements still gate release.

The independent build at source 3757a48 uses its own Cargo target and matches all
49 distribution files, packaged WASM, and the raw compiler WASM byte-for-byte.
The immutable native source input manifests differ only in README.md, which is
not compiled; the later documentation update is recorded explicitly in
reproducibility.json. Both builds use Bun 1.4.4+absolute.1.

A separate 24-case game comparison at unchanged native default static softness
(60 Hz / 10) still rejects variant 0 / 960 Hz at -21.007 mm, while correcting
variant 5 / 960 Hz (-0.119 mm). Its harness exits nonzero as intended; this
limitation is retained in the game research branch. The package correction does
not by itself qualify the game's old contact policy. The proposed game upgrade
requires the jointly tested explicit 600 Hz policy (24/24 accepted and asleep).
This is a product policy qualification, not a universal parameter recommendation.

Paired CPU measurements use 12 warmups and 12 alternating measurements, with
source hashes and repeatable physical state checks. Three ordinary active-world
controls have candidate/baseline median ratios 0.996 (speculative), 1.002 (stack)
and 1.008 (falling grid). In the affected saved tree onset, equal 256-step work
costs 0.6520 ms/step for published defaults, 0.6623 ms/step for candidate defaults,
and 0.5671 ms/step with the proposed 600 Hz policy. Restoration and inspection
are excluded. Contact trajectories differ, so the latter is a bounded fixture
observation, not a general speedup, whole-fall cost or browser FPS claim.
