# Candidate 16: incremental contact components

Research optimization of candidate 15; no new physical acceptance or game adoption. The graph uses union by size, compressed root lookup and explicit member lists. Each link returns only body fractions that decreased; the solver queues those bodies instead of reconstructing the whole graph after every link. Components retain generation-safe handles and deterministic sorted final fractions. This removes repeated whole-graph reconstruction, not every possible worst-case repeated decrease in a dense contact network.

Eleven native helper tests pass. They include 50 deterministic generated graphs compared with an independent iterative reference, reversed edge order, invalid fractions, disconnected components, generations, and a 10,001-body chain that reports each new body once.

All 126 oriented physical controls and eight stacked controls pass and match candidate 15 exactly. Only stack elapsed time is excluded from comparison; positions, speed, clearance and all oriented phase/hit traces match. These scene rotations test coordinate orientation, not bodies rotating over time.

Three saved game windows verify 384 distinct state hashes against candidate 15, with both tracing disabled and enabled. All 128 frames in each mode match, with no intervention flag. See the game incremental-clamp-parity-summary.json and per-window evidence. These exact windows cover residual overlap regions, not the entire lifetime of arbitrary worlds.

Narrow kinematic gates, strict public type contract and bounded GPU-disabled Chromium diagnostics pass. Full research suite remains 18 pass, four retained upstream-motion parity failures, 48,803 assertions. This matches candidate 15; no failing test was removed.

Outstanding physical gates: residual chip/cavity overlap; moving rotations and general compound shapes; time-step/energy/trajectory behavior; dense moving contact networks; known one-pass prescribed-kinematic limitations. Published game dependency remains 0.4.0. Do not publish this private research kernel.
