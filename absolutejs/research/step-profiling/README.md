# Bounded managed-step sampler — 2026-10-28

Additive JavaScript API over the qualified 0.11.0 kernel. No Rust, solver policy,
native serialization or qualification manifest changes. Native bytes remain
352f0e9ff982bd9486e3771bf65fab1944f81ca53f7a5f5d43bee56acdaff6a0.
The API build reuses the audited 0.11 raw native build; it does not claim a new
native compilation. A separate API build will use the independently built 0.11
raw artifact before release.

The initial complete suite passes 187 tests / 77,234 assertions, including 11
new sampler cases. These check exact physical snapshot parity for profiling on
and off, selection/capacity accounting, owned copies after world disposal, exact
thrown values, invalid clocks, duration overflow, capture/setup/restore failures,
configuration bounds, zero-budget long stepping, and borrowed event queue/hooks.
Browser-worker coverage also compares exact physical snapshots with unsampled
stepping. Native samples are bounded; the wall-time summary covers all managed
calls but excludes sampler bookkeeping. Phase times overlap and must not be
summed. No automatic runtime instrumentation or delivery is introduced here.

Preserved setup failures: the first API build lacked the raw artifact required
by build-api; copying only generated bindings was insufficient. The first
browser attempt was blocked by sandbox localhost listen permissions; its retry
uses the same GPU-disabled test with the required execution permission.

Fixture: copied from hello-world/tests/fixtures/convergence-impact-before.bin,
a pre-impact native snapshot captured on 0.9.0. SHA256: 64e5cb12f837ed78dfb9259e990321e3b05e3ab2976974684ec8231b59c9aac3.

Integration rationale: existing @absolutejs/performance handles web/resource
metrics, @absolutejs/metrics exposes metrics, and diagnostics/beacon already
provide game recording and delivery. Native step sampling belongs with the
Rapier API; the game supplies sampling policy and existing diagnostic transport.
Do not duplicate the full sample array per body or label lab jobs as all gameplay.

Release archive, registry and game adoption are not yet verified by this record.

## Release qualification

Final 0.12.0 suite: 187 tests / 77,234 assertions, all passing. Declaration
contracts pass. GPU-disabled browser-worker checks pass. All 49 distribution
files and packaged native bytes match a separate API build using the independent
0.11.0 native artifact. No new native compilation was necessary. Archive audit
verifies file allowlist, exports, README identity and every distribution byte.

Twenty alternating measured pairs after four warmups compare a 512-step coupled
fixture loop including sampler overhead. Baseline median 14.771295 ms; sampled
median 15.511888 ms (16 captures, cadence 32). All paired final native snapshots
match exactly. This small CPU workload is not a universal overhead estimate or
browser FPS test; raw paired observations and source are retained.

Initial npm pack could not write the default cache under sandbox permissions;
retry used this worktree's .cache/npm. The tarball SHA256 is
d2fb721bd99699beac726f1fd82539b04f45034e00cf70418947dfd77de457cb.
Publication and game adoption still require registry and installed-byte checks.
