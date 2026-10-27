# 0.7.0 lightweight build identity — unchanged 0.6.0 kernel

The release adds a metadata-only package export, the same frozen metadata on the main API, and declarations. The original 0.6.0 native checksum manifest is retained. The API build rejects any other kernel. `qualifiedKernelRelease` is 0.6.0 while `packageVersion` is 0.7.0; `solverChanges` means differences from pinned upstream, not from the previous package release.

A separate gyro-increment candidate reduced force-free error but failed two game tree-contact tests during its complete-suite run. It remains on `release/gyroscopic-precision` with raw results and is excluded from this release. No contact limits or first-attempt acceptance tests are relaxed. Stable source and bindings remain exactly those of 0.6.0.

Build tests hash actual packaged native bytes, compare the root and lightweight identities, verify immutability, and import metadata with WebAssembly disabled. The original 28 runtime checks remain, including exact upstream motion comparisons. Browser checks disable GPU rendering. Tarball auditing compares every distribution byte and both package entry points.

Status: all 30 package tests / 48,034 assertions pass, including exact upstream motion parity. Type checks, the GPU-disabled browser worker, artifact identity checks and tarball checks pass. The exact 0.6.0 native bytes are retained, and the rejected gyro bytes fail the stable checksum guard. Not published; complete game qualification and registry verification remain required.

The unchanged-kernel parity run hit the old 10-second wall budget at both 1920Hz cases while host load averaged about 9.09/7.78/6.08. The test cap is now 20 seconds (25-second outer timeout); the two-second simulation, sample schedule and exact upstream equality assertions are unchanged. The initial failures are retained. This is a bounded correctness test, not a hardware performance benchmark.
