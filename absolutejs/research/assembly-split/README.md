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
