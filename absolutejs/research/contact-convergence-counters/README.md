# Opt-in adaptive contact convergence observations

Private diagnostics candidate based on published 0.10.0 source c8f0fb7. Keep physical equations, tolerances, loop budgets and all state updates unchanged. Report phase counts, iterations, final residual maxima and phases that exhausted their budget above tolerance. Aggregate across CCD passes using existing solver counters, reset with the existing per-step profiler lifecycle, and expose an owned object only after a completed profiled step. Counts are solve phases/groups, not physical islands or contacts.

Raw counter access is confined to the same single-worker guards that qualify adaptive solves. Profiling disabled leaves these counters untouched; no per-iteration allocation is added. Neither profiling counters nor their freshness state are part of the persistent world snapshot. No package publication or installed dependency change is implied by this private source.

Qualification must include profiler on/off physical snapshot parity, repeated query nonmutation and owned return values, unavailable/fresh/reset/restored lifecycle, no eligible solves, coupled solved cases, actual budget exhaustion, configured iteration minimum, multiple substeps, and browser worker. Compare the new kernel's existing collision/free-motion matrices exactly with published 0.10.0, then build independently before any release.

## Candidate results

Native SHA256 `352f0e9ff982bd9486e3771bf65fab1944f81ca53f7a5f5d43bee56acdaff6a0`, 3,298,167 bytes. The build guard correctly rejected reuse of the 0.10.0 identity; a private identity allowed candidate qualification. The first full suite passes 174 tests / 77,019 assertions. Two subsequently added CCD tests pass in the focused 11-test / 124-assertion suite. Final release tests will include all 176 cases. Types and GPU-disabled browser controls pass.

All 548 paired physical-result records exactly equal installed 0.10.0: 72 coupled PGS cases, 324 unequal-mass cases, 80 free-motion cases and 72 isolated/friction cases. The unprofiled benchmark also preserves exact measured body/collider state hashes. Median timings are comparable to the prior version; do not claim a measured speedup.

Two failed test assumptions are retained: the 20/1/20 kg fixture actually reaches the restitution cap at a 2.1457672119140625e-6 m/s residual; and an initial CCD pass before contact has no eligible adaptive phase. Equal-mass early stopping and a two-stage CCD contact fixture now independently check the intended meanings. An independent float32 normal-velocity calculation matches the exposed terminal residual exactly. No physical threshold or policy was changed to make the tests pass.

Version 0.11.0 metadata is prepared. Independent build, final archive and registry verification remain required before adoption.

Final 0.11.0 package tests pass: 176 tests / 77,033 assertions, with declaration contracts passing. No native changes were needed after the initial diagnostics build; the failing cases were incorrect test assumptions about which phases execute or reach tolerance. The original logs and the CCD test sources are preserved.

## Final release qualification

Independent offline build completed in 6m27s with two Cargo jobs and a separate target directory. Packaged native bytes and all 48 distribution files match exactly; raw executable/data sections also match, with only unshipped wasm-bindgen custom metadata differing. Source manifests differ only in README content. Final native build input/flag checks pass.

Final 0.11.0 browser worker passes with GPU disabled. The audited archive `.absolutejs/pack/absolutejs-rapier3d-0.11.0.tgz` has SHA256 `92339dc5d2f3d36b0a14d291ce6871164b2650fe8ceaffe7b8800021b814568e`, SHA1 `72405fdcfd09598975738011de88931d0b8988d8`. Every distribution byte, native payload, export, file allowlist and canonical README is verified.

Prepared game inspection integration is backed up separately on `research/convergence-observations` at 021c943, with six focused tests / 58 assertions passing against the explicit candidate. Canonical game source remains on published 0.10.0 until registry verification, installed-byte audit and adoption checks complete. Publication and adoption are not asserted by this qualification record.
