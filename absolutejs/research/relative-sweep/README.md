# Two-moving-proxy CCD qualification

This isolated CPU probe checks Parry 0.31.1's existing `sweep_time_of_impact`
primitive against analytic sphere contact times. Thirty cases cover head-on and
perpendicular crossings, a near miss, common 3D velocity boosts, and swapped shape
order. It uses f32 and the primitive's documented contact slop. It does not change
Rapier, the published package, or the game dependency.

Run from the repository root:

```sh
CARGO_BUILD_JOBS=2 cargo run --locked --manifest-path absolutejs/research/relative-sweep/Cargo.toml
```

Use `--offline` when the pinned crate cache is available. The crate has its own
workspace and committed lockfile; build output belongs in a durable checkout cache.
This research is not part of the npm package's file list.

The game-level reference-frame fixture crosses despite valid analytic collision
times. This probe isolates whether the two-sweep primitive itself is capable of
handling the relative motion. Passing this probe does not qualify the world solver:
activation, swept target bounds, pair filtering, moving compound targets, contacts,
rotation, clamping order, energy, and bounded scheduling need separate evidence.

Result: all 30 moving-sweep cases match their analytic expectation.
Freezing the second target at its final pose disagrees with the analytic result in
23 cases. This negative control isolates the lost motion information; it
does not prove that replacing this one call fixes world-level CCD.
