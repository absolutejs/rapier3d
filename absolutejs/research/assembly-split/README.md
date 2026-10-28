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
