# Multibody writeback release qualification

Candidate 0.8.1 refreshes linked rigid-body velocities after the final solver update and derives final COM lever arms from integrated link transforms. It preserves the original restitution algorithm, sweep count and contact defaults. Native source matches research/multibody-writeback at 14f9e49. The private candidate passes 39 package tests plus the separately added revolute-joint test; fixed assemblies, rotations, offsets, timesteps, scales and insertion orders are covered. Full game qualification is running separately; independent native reproduction, browser and packaging checks are still pending.

Scope: current articulated velocity consistency. The 48-case comparison leaves compound-body controls unchanged, improves maximum articulation momentum-reporting error from 20.000003 to 0.060015 kg m/s, and reduces fixed-link rigid velocity residual from 0.015683 to 2.8e-7 m/s. Off-center integration is not conservative: maximum energy gain is 0.276682 J from 40 J (stable 0.275773 J), angular momentum error is 0.201618 (stable 0.201381). These limits remain explicit; do not describe this patch as a conservation fix or adopt the rejected global-sweep experiments.

The candidate manifest remains private until qualification and the scoped release decision are complete. No game dependency has been changed.


The isolated game run completed: 828 tests, 7,408,613 assertions, unchanged inputs. Both application and physics-tool type checks passed. All sixteen captured stable failures restore without changing the snapshot and replay deterministically with corrected collinear momentum. The GPU-disabled browser worker passes new articulation checks and existing contact/CCD controls. Sequential captured-step timing medians remain comparable within observed noise; raw timings are retained without an FPS claim.

The first canonical build attempt used an empty local Cargo cache and failed to resolve GitHub in the sandbox; its log is retained. The corrected independent build uses the existing pinned dependency source cache with `CARGO_NET_OFFLINE=true`, while retaining a separate Cargo target directory and immutable source snapshot. Sharing downloaded source does not share compiler outputs. No dependency revision changes.

## Scoped release decision

0.8.1 is qualified for the articulated velocity consistency correction. The final release-labelled package passes all 40 tests (57,606 assertions) and the CPU-only browser worker. Independent native builds have identical executable/data sections and identical packaged WASM. All 48 distribution files match; only the unshipped raw wasm-bindgen custom metadata differs between compiler intermediates. The final API differs from the fully game-tested candidate only in package version and release identity, verified byte-for-byte after those two substitutions.

The exact publish archive passes the canonical tarball audit: all allowed files and bytes, embedded native payload, lightweight identity, documentation and provenance agree. `pack-audit.json` records integrity and SHA-256. Source and these records are committed before publication; npm confirmation and public game adoption are separate pending steps. No restitution-sweep experiment is included.


## Publication and adoption complete

npm accepted 0.8.1, then served registry metadata with integrity exactly matching the audited archive after its processing delay. The initial 404 responses are retained as processing evidence; no duplicate publication was attempted. The game pins and installs 0.8.1 at c5e16b6. All 52 installed archive files match. Frozen installation, static runtime dependency resolution, both current type checks and 9 installed-package tests / 420,308 assertions pass, including all-species contact gates. The source release remains tag/commit 8aa7e21; this later commit only records publication and adoption.
