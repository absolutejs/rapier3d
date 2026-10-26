# @absolutejs/rapier3d 0.4.0 qualification

Adds validated contactRecycling, normalizedContactRecycleDistance and
warmstartCoefficient API controls for existing native integration settings. Defaults
remain true, 0.05 and 1. This release branch contains no research CCD algorithm change;
`git diff absolutejs-v0.3.0 -- src` is empty. Native solver numerical parity is retained.

- Bun 1.4.4+absolute.1; Rust/Cargo 1.94.0; bindgen 0.2.129; native build capped at two jobs.
- 19 tests pass, zero fail, 47,984 assertions, including upstream trajectory parity,
  explicit-policy solid-floor response, invalid-input protection and native snapshots.
- Strict public type contract passes, including rejected wrong policy types.
- Bounded GPU-disabled browser worker passes contact/CCD diagnostics and policy restore.
- Node 22.14.0 imports the packed artifact and verifies policy snapshot behavior.
- All 50 packed files byte-match the tested source/generated artifacts; SHA256 list saved.
- Tarball SHA1: 592d27a4ee84eb32057a62b37667b7adc1710235.

Packing initially hit the sandbox's read-only default npm cache. It succeeded with
the cache redirected to this durable checkout; no source change or reduced validation
was used. npm registry reported no existing 0.4.0 before publication preparation.

Publication and registry-byte verification are separate final steps. Do not infer
publication from this preparation record. The game retains 0.3.0 until a published
artifact has been verified and adopted.
