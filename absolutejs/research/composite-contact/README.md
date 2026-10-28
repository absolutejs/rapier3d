# Composite terrain contact reduction

Base: published 0.16.2 receipt `b113d14`; canonical game adoption `af30e821`.
This explicitly private investigation makes no native production changes.
The convex fix is delivered; do not reopen its release. Reduce generated
terrain support separately, retaining original limits and optimization defaults.

The inherited corrected airborne snapshots represent the real variant-0
terrain fixture at 480/960/1920 Hz. The initial native probe measures convex
vertex clearance at the game cadence under four one-factor controls. It is
not the full game gate and cannot establish WASM parity. First record the
unchanged published-source native baseline, then capture exact first-failure
contact features and test a mechanism before changing the engine.

Use offline Cargo, checkout-local targets, at most two compiler jobs and no
native GPU. Preserve failed hypotheses, exact source and bounded receipts.

## Unchanged native baseline

The 12 native controls complete using published 0.16.2 production source.
Default proxy clearance minima are -17.683/-5.217/-20.964 mm at
480/960/1920 Hz; the last stops at the original -20 mm threshold. More
iterations passes all three rates, but disabling clustering can regress the
960 Hz case to -22.260 mm. These observations do not justify disabling
clustering or changing the game's solver budgets. WASM replay is being
measured independently; native f32 execution is not browser-byte parity.
