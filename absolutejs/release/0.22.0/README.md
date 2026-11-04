# 0.22.0 qualification

Exact represented-coordinate coplanarity preserves shallow convex faces and native
mass. A bounded convex/cuboid interior-face path includes the true supporting
vertex, preserves contact feature IDs and uses the analytical finite face normal.
Edges, corners and unsupported queries fall back to the existing path. Generic
halfspace queries are unchanged; this is not a universal exact arithmetic solver.

316 package tests pass. The isolated game candidate passes all 1,127 tests at
hello-world c4989246. Parry libraries pass 91 f32 and 90 f64 tests at 8377035.
The frozen cut fragment sleeps after 13,853 steps at 1920 Hz (7.215104 seconds),
without changing physical qualification limits. Twelve new stone forms have
correct mass and sleep within 20 seconds, but five still fail the original
10-second gate; those forms remain experimental.

Two independent native builds match all 53 shipped files exactly. Intermediate
WASM differs only in wasm-bindgen custom metadata; executable/data sections and
shipped native bytes match. The first independent build was interrupted by a
machine shutdown and is not counted as passing. Its compact log is retained.
The successful retry used one low-priority compiler job and a 3 GiB virtual-address
limit. This does not establish the cause of the shutdown.

The exact archive passes payload/provenance audit, identity-only promotion audit,
ten extracted-consumer motion/event/hook scenarios and the physical fragment.
The GPU-disabled Chromium worker also passes. Four historical CCD scenarios
intentionally change motion or event counts; old and new records are retained in
research/convex-face-preservation. Clearance stays within the configured native
allowance; snapshot and edge controls pass. Do not claim all old motion is unchanged.

Archive SHA256: bb2be3d0a6ac98ba1d6c4a8009e6f3be957197ce484a9cf04249c84294b45b77.
The pending archive is in .absolutejs/pack, not committed as another permanent
binary copy. Keep it until npm publication and registry byte verification finish,
then remove it and the extracted consumer. Existing completed archives were
removed per the user's storage-retention request; removed-archives.json records
recovery identities. Source, tests, build scripts and compact receipts remain.

Publication and main-game adoption are pending. Main game remains on 0.21.2.

The completed independent checkout and extracted consumer were removed after
recording the passing audits, per the retention request. Recreate the independent
checkout from fb1a568 to reproduce the build. The single 0.22.0 publish archive
remains pending npm authentication; no completed release copy was added to Git.
