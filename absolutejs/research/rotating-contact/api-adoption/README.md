# Adopt the canonical 0.5.0 diagnostic API in private research

The Collider current-body query and its tests come directly from stable source commit 29689a8. The native candidate-16 kernel is unchanged byte-for-byte; this branch remains private and unqualified, version 0.5.0-relative.0. No stable physics kernel was copied into research, and no research solver was published.

The research suite has 21 passing tests and the same four retained upstream-motion parity failures (48,827 assertions). All three new query tests pass; strict public types also pass. This adoption changes only API code and does not resolve the solver's physical limits.

Using this API at the three saved game peaks reproduces all 384 recorded frame hashes and preserves the exact snapshots around each query. Fresh geometry reports roughly 29.07, 34.61 and 54.11 micrometers of penetration; stored-anchor projections report 33.37, 34.66 and 64.32 micrometers. Both argument orders agree closely. Therefore the chip/cavity residual is not merely a stale-normal reporting artifact. Detailed engine/source-identified receipts are committed in the game's fresh-residual-contacts records.
