# Candidate 11: EPA tolerance experiment — rejected for promotion

Unqualified research only. No npm release or game solver adoption. This candidate
retains the relative-motion CCD research and changes one Parry EPA comparison:
`dist < curr_dist` becomes `dist < curr_dist - dist_tol`. The existing tolerance
avoids a premature numerical-regression return in some nearly touching cases.
The pinned upstream crate source and Apache-2.0 text live in absolutejs/vendor;
bindings/typescript/Cargo.toml and its committed lockfile select it reproducibly.
The vendor audit identifies the upstream archive and the single implementation diff.
No source or build depends on a temporary directory or a game-local dependency patch.

Engine bundle SHA256:
`351c8f9586aa6739f5cb0ffff1feaeb8c4b09d2841a4846d305a00881e4b1866`.
Build uses Rust 1.94.0, two Cargo jobs, bindgen 0.2.129 and Bun 1.4.4+absolute.1.
Native build completes with the existing warnings; API/declarations build succeeds.

## Evidence

The game's exact candidate-10 pre-step-352 snapshot verifies 128 subsequent state
hashes and isolates the false 30mm contact at step 479. An independent prescribed-
pose native compound query reproduces it without a dynamics solver. The candidate
removes large excursions across both precisions, both pair orders and fresh/persistent
query caches. Full cold dynamics then complete the previously truncated run, but:

- With 960Hz contacts and recycling disabled: 1920/1920 steps; sampled overlap 4.55%,
  every-step measurement finds 7.34346% in the retained 800–927 window.
- With 960Hz contacts and default recycling: sampled overlap 14.79350%, versus the
  earlier 0.23733%. Every-step window1504–1631 verifies 14.79358% at 1552.
- With 240Hz contacts and default recycling: sampled overlap 2.90169%, unchanged to
  reported precision.

The later penetration is also present in f64 prescribed-pose geometry queries.
The EPA precision fix is insufficient and the default-recycling regression blocks
promotion. Do not mistake a completed horizon or improved early contact for acceptance.
Game records: docs/material-provenance-2026-10-26/fresh-contact-reduction.md,
relative-ccd-candidate-11-cold-summary.json and the two new exact replay fixtures.

## Regression checks

- Full research package: 17 pass, 2 fail, 47,800 assertions. Failures remain the explicit
  upstream-motion parity tests at 960/1920Hz tilt 0.3; they are not suppressed.
- Narrow kinematic gate script passes 135 dynamic controls, 12 kinematic crossing cases,
  6 paths, 5 filters, 36 scale/order/frame cases and 12 simultaneous-impact cases.
- GPU-disabled browser worker passes. This is CPU/WASM validation, not rendering FPS.
- Game diagnostic probes pass strict types; prescribed-pose input bounds reject
  empty/oversized sequences and invalid indices.

The two package failures and material-overlap regressions remain open. No numerical
threshold, game default, material geometry or mass was relaxed. Next isolate the
floor-mediated motion around step 921 with internal solver/CCD phase observations.
