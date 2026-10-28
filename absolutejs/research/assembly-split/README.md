# Partial assembly split continuity investigation

A four-body fixed chain rotates with explicitly zero generalized damping. After
24 steps, remove its middle joint, producing two two-link assemblies. The removal
call itself preserves every public body pose and velocity exactly. On the next
step, however, both new roots have zero generalized velocity: linear momentum,
angular momentum and kinetic energy all disappear (relative errors 1.0).

The same reproduction fails on retained published 0.14.1 and on 0.15.0. This is
an inherited topology-transition defect, not a regression introduced by aggregate
integration. Both resulting damping vectors are zero. The 0.15 path reports
accepted assembly steps after the loss, illustrating why zero residuals or
accepted-step counts do not establish physical conservation.

Source inspection: remove_link creates each resulting root as fixed. The next
update_root_type converts a dynamic body's root into a free joint, inserting
zero generalized velocity rows rather than preserving the body's existing
COM/angular velocity. Initial assembly construction uses with_root (already
marked dynamic), so correcting the false-to-true transition need not alter
initial descriptor/generalized-velocity semantics.

The strict reproduction and both failure logs are retained. No fix has yet been
qualified. Next preserve body COM/angular velocity at this root-type transition,
then check partial splits, fixed/kinematic-to-dynamic transitions, nonzero local
COM, gravity, snapshots and unaffected controls. A physical fracture-energy model
and policy for inherited nonzero root damping/armature are separate questions.

The first private correction copies the released body's existing velocity into
new free-root generalized coordinates. The strict reproduction now passes:
maximum relative linear momentum 1.532e-7, angular momentum 2.924e-7, energy
1.643e-7, and COM position error 3.896e-7 m over 24 steps. Both resulting
assemblies report eight admitted substeps per frame. This is one fixture, not
release qualification; broader transition/gravity/scale and replay checks remain.

A 48-case matrix passes with scale 0.01/1/100, both chain directions, tilted and
axis-aligned assembly frames, zero/uniform gravity and 60/240 Hz. Maximum errors:
normalized momentum 2.642e-6, relative angular momentum 4.315e-7, normalized work
residual 4.109e-7, scale-normalized COM position 8.026e-7. This first matrix tests
the velocity correction before original-root property retention.

A separate strict test then showed that remove_link also discarded the surviving
original root's generalized velocity, damping, armature and friction vectors.
Retaining that original root joint and its dynamic flag preserves these existing
DoFs and allows surviving couplings to remain associated with them. Only newly
released subtree roots get new free coordinates. The property-retention test and
all split cases pass after this extension (retained-root-correction.log). The
expanded full native suite, including fixed-to-dynamic velocity activation, is
running; browser, independent-build and game qualification remain pending.

The expanded single-worker run passes 13 tests. An independent comparison checks
386 excluded physical state records and 127 existing aggregate measurements;
all remain exact. Fixed-to-dynamic activation also preserves the explicitly
prescribed world COM/angular velocity for three root choices. A further focused
root-coupling test passes: original-root couplings survive with their indices and
coefficients intact. Two-worker execution and three existing upstream coupling
lifecycle tests are being qualified together before any WASM promotion.

The bounded two-worker native run passes all 13 research tests plus three existing
upstream coupling-topology tests. The environment limits the global Rayon pool
to two workers; original fixture worlds explicitly configure two-worker pools.
New SDK tests are prepared for partial-chain conservation, 120 exact replay steps,
original-root damping retention and prescribed fixed-to-dynamic activation. They
remain pending the new WASM build; these source tests are not yet passing claims.

The allocation-enabled no-std check also passes (57.76 seconds). The bounded
browser worker now includes a prepared partial-split momentum and 32-step exact
replay check. Both the SDK and browser additions await the new private WASM
build; the production correction remains 13 added/three removed lines in one
native source file, including explanatory comments.

## Pending connectivity snapshot defect

The first private WASM build passed damping retention and fixed-to-dynamic
activation, but failed the strict post-cut snapshot replay test. Both this build
and published 0.15.0 reproduce the mismatch: snapshot roundtrip before stepping
is exact and all public body states match for 32 replay steps, but the serialized
island bookkeeping differs after stepping. The published build also loses the
motion as recorded above. Raw captures and measurements are retained in
`snapshot-candidate/` and `snapshot-published-0150/`; these are failures, not
successful exact replay qualifications.

The native joint sets omit pending connectivity queues from their ordinary
serialization. A cut made before saving therefore disappears from the restored
event stream while the old island graph remains serialized. The candidate adds
an opaque `PendingIslandEvents` companion and a versioned SDK snapshot envelope
(`ABSJS3DS`, little-endian version 1). It preserves ordered multibody, impulse
joint and soft-body connectivity events plus dirty impulse-joint handles. It
does not flush edits or scan/reconstruct the entire world during capture.
Historical raw captures remain readable for investigation; missing historical
events cannot be recovered. Every new save uses the canonical envelope. The
implementation and new strict tests await WASM qualification.

## Remaining material removal failure

A separate test removes each actual body from a rotating four-body chain and
measures momentum, angular momentum, energy and COM of the remaining material.
Immediate remaining poses/velocities are exact. Removing body 2 exceeds the
predeclared 1e-4 relative angular-momentum bound over 120 steps (3.2152e-4).
`material-removal-corrected.log` retains this strict failure; the earlier
`material-removal.log` records an import visibility compile error. This does not
invalidate the narrower joint-cut results, but blocks a claim of fully qualified
material-removal conservation. Investigation is pending; the bound is unchanged.

The follow-up observation run (`material-removal-observed.log`) intentionally
records all four cases without treating their bounds as passed. It reports zero
ordinary midpoint steps even for the free fragment: the global presence of an
assembly excludes the entire batch. Ordinary-body initialization already skips
every multibody link, so removing that redundant global exclusion admits only
ordinary bodies. Contact, impulse-joint, soft-body and FEM exclusions remain.
The strict rerun (`material-removal-eligibility.log`) passes all four cases.
The two cases with an ordinary fragment now report 480 midpoint steps each;
maximum relative angular-momentum error is 2.338e-5. This is still a bounded
fixture result, not a claim of general contact/fracture accuracy.

Native checkpoint qualification (`pending-native-snapshot.log`) passes six edit
scenarios across two tests: impulse insertion/removal, per-joint and bulk disable,
and soft-body insertion/removal. Each retains exact serialized state through
eight subsequent steps. The first WASM envelope compilation caught an edition-
specific missing `TryInto` import; its failure log is retained and the explicit
import is corrected. The rebuilt WASM tests remain pending.

The combined native run (`full-snapshot-candidate.log`) passes 14 assembly tests,
two checkpoint tests and three upstream coupling-topology tests. The updated
comparison script accepts explicit input/output paths so earlier receipts remain
intact. `snapshot-unaffected-comparison.json` confirms all 386 exclusion-control
state records and all 127 existing assembly measurements are exactly unchanged
from the retained 0.15.0 native baseline.

## Private WASM qualification

The corrected native build completed; the qualification guard intentionally
rejected its changed bytes until the explicitly private research manifest was
updated. The candidate WASM is 3,324,606 bytes, SHA-256
`fb44e31fd971a0577889408a95266ab1e61d9293a1f6657647ca51417b93c83d`.
All 207 package tests pass (86,667 assertions), including 120 exact post-cut
replays and 120 exact ordinary-body comparisons with/without an unrelated
assembly. Public declaration checks pass. The GPU-disabled browser worker passes
including 32 exact post-cut replays. Its first invocation failed while writing
evidence because a fresh checkout lacked the output directory; the verifier now
creates it, and the rerun and JSON receipt are retained.

The private archive audit verifies every distribution byte and embedded WASM;
archive SHA-256 is
`f4716656e4537569f3fd624154280dc827b4a37563287519597d6d5008f7caca`.
It is copied into the isolated game qualification checkout with an installed
53-file audit. Canonical game dependencies remain unchanged pending release.

The bounded CPU snapshot benchmark uses ten alternating pairs, each capturing
200 snapshots of 128 bodies. The envelope adds 45 bytes (63,189 to 63,234), and
capture leaves both worlds unchanged. The observed median paired time ratio is
0.885; this short host-specific run does not establish a general speedup or FPS
claim. Independent builds, two-worker native checks and full game qualification
are still pending.
