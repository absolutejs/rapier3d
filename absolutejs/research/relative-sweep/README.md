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

## World-level prototypes

The branch now also contains numbered, unreleased Rapier candidates. Candidate
folders preserve source-identified build/API receipts, kernels' provenance, sphere
matrices and failed qualification records. Candidate 4 fixes duplicated sensor
crossing events and preserves candidate 3's physical trajectory.

The game repository's relative-ccd-candidates.md records complete geometry audits.
With candidate 4 and a minimum CCD duration scaled to outer dt/100, the old saved
checkpoint peak falls to 0.56106%, but the fresh trajectory still peaks near 2.90%.
All 128 frames of a new candidate-only impact snapshot replay exactly. This remains
unqualified physics. Cap-one timing and general rotating/shape/material qualification remain limited. Never infer physical acceptance from the sphere tests alone.

Toolchain for these CPU/WASM builds: rustc 1.94.0, cargo 1.94.0, Bun
1.4.4+absolute.1, wasm-bindgen 0.2.129. Native builds use two Cargo jobs. Research
WASM is retained in this checkout's durable .cache/target directory; source and
receipts, not generated caches, are the remote backup. Production remains registry
@absolutejs/rapier3d 0.4.0. No native GPU work or PAAS change was performed.

## Kinematic follow-up and measured cost

Candidates 5–9 preserve prescribed outer-step trajectories, wake sleeping targets
before impact solving, retain all equal-time solid participants, and avoid rebuilding
swept-target leaves for exactly unchanged poses. Candidate 9 passes the combined
kinematic/simultaneous/filter/scale gate and preserves 512 full body/contact state
hashes across the game checkpoint matrix. CPU-only 1,000-target observations improve
from candidate 8 median 4.26ms to 1.43ms; this is not a browser FPS claim. Every failed
intermediate experiment and final qualification receipt is retained. The compound
material-overlap limit remains, so the private package is not published.

Run the narrow acceptance gate after generating the candidate's probe outputs:

```sh
python3 absolutejs/research/relative-sweep/check-kinematic-qualification.py absolutejs/research/relative-sweep/candidate-9
```

The game checkpoint probe's `--state-audit` flag and `compare-ccd-state.py` add exact
bounded body/contact fingerprints for optimization comparisons. They do not make
physical acceptance claims or add per-frame production telemetry overhead.

## Contact precision and clamp follow-up

Candidates 10–11 isolate a false compound contact and test EPA precision. Removing
that false contact alone is insufficient: candidate 11 regresses a cold material
history to 14.79% sampled overlap. Candidate 12 adds bounded opt-in phase and
accepted-hit tracing; it preserves all three 128-frame baseline fixtures exactly.
The trace identifies CCD endpoint shortening as the source of large overlap spikes.

Candidate 13 advances accepted dynamic impact components at one shared time
fraction, including slower targets. This fixes one mechanism but misses a floor hit
where an already-touching chip has no new sweep hit. Candidate 14's broad touching
component is rejected: it drags a frictionless neighbor with no blocked trajectory.
Candidate 15 propagates only across contacts whose normal constraint is worsened by
independent clamping. See [qualification and limits](candidate-15/qualification.md).
Its 126 oriented controls and eight stacked controls pass, as do narrow kinematic
and GPU-disabled browser checks. Residual material overlap and four retained
upstream-motion parity failures prevent release.

Candidate 16 optimizes the contact graph incrementally; qualification evidence is
kept in its own folder. Treat it as unqualified until its receipt explicitly records
trajectory parity and the physical controls. Neither these solver changes nor the
research-only trace API has been adopted in the published game dependency.

The game repository contains `docs/material-provenance-2026-10-26/` with exact
replay snapshots, phase measurements, every-frame windows and the corresponding
findings. Read those records before repeating investigations. Candidate numbers
identify reproducible experiments, not npm release versions.
