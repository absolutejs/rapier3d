# Deferred0.21.0 release qualification

The public convex boundary reconstruction previously produced invalid outward
faces on a captured tree fragment. This release reconstructs boundaries in
double precision from the unchanged stored Float32 points. An exact-sign rank
check preserves thin full-dimensional clouds instead of treating them as planar.
`Collider.convexMeshData()` returns both owned buffers in one native query.

Native storage, contact shape construction and solver arithmetic remain f32.
The export does not become a direct view of internal contact faces. Native mass
and exported boundary volume remain distinct diagnostics; the game retains its
mass checks and decomposition fallback. Rounded exports exclude border radius.

Qualification:
-295package tests /92,759assertions;26exact captured boundary certificates.
-26GPU-disabled browser-worker boundary certificates plus existing controls.
-Independent native targets and all53API files match byte-for-byte.
-18fixtures /9,240full-state steps match0.20 exactly, both profiled/unprofiled.
-168/168game coverage cases pass with unchanged tolerances on the identical
 private native kernel.947game tests pass on that private candidate.
-Exact archive audit passes; extracted archive consumer certifies26boundaries,
 query nonmutation, inherited profile transport and drag APIs.

Archive SHA256:
`e793af5f65c83c2085228cb73a65856a6228fda443770c91688abf1eae9e4de6`.
Native SHA256:
`f1a909f788cc332e4ed8a4af3da1f38c84fd9bd995aa1ffe85dd9bee36f04050`.

The complete contact matrix remains166/168 at960Hz. The existing1920Hz retry
resolves one failure; the other naturally sleeps at36.4667seconds in an unchanged
live-world continuation. Both960Hz controls remain awake through60seconds.
These are retained limitations, not accepted results or a timeout-policy change.
No new settling regression was introduced by this export repair.

Publication is explicitly deferred while the user is away. No npm authentication
or publish operation is part of this qualification. This consolidated release
will supersede deferred0.20 after final stable game-adoption validation.
Historical private archives remain in research/convex-export/private-{0,1}.

Final stable0.21.0 game adoption passes **947tests /7,619,391assertions**,
310files,146.31seconds. Source and all three explicit candidate distributions
remain unchanged during the run. Game receipts are in
`docs/native-export-landing-2026-11-01/stable-*` in the game research checkout.
All required release checks are complete; only deferred publication remains.
