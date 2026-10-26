# Release qualification: 0.1.0

Bun 1.4.4+absolute.1, Rust 1.94.0, wasm-bindgen 0.2.129.
Six tests pass with 38,991 assertions. At 960 and 1920Hz, in two initial orientations,
the query-only build matches the official 0.21.0 package's sampled positions,
rotations and linear velocities exactly over two simulated seconds. These are
bounded fixtures, not a universal numerical-equivalence proof.

Actual clustered contacts are exposed separately; callback flipping, nested reads
and exception cleanup are exercised. The GPU-disabled Chromium worker reports 24
solver contacts where the original geometry query reports zero. The type contract
excludes original subshape identifiers from the clustered solver view. Declaration
build and the strict consumer type check pass.

The package is ESM and contains an embedded WASM engine, so no hosted service,
separate WASM URL, native GPU, or per-call provider is required. The inspected npm
archive has 50 entries and is approximately 1.78MB compressed / 5.10MB unpacked.
The manifest records the exact resulting WASM hash. The build emits existing
upstream cfg/unused warnings; no native compile errors occurred.

This release changes inspection only. The known cube/cavity overlap remains, and
no game trajectory or physical gate is accepted merely because the new query
returns finite values. Solver contact distance is cached engine data; independent
geometry checks remain required.
