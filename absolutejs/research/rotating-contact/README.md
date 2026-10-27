# Rotating contact isolation

CPU-only candidate-16 probe; no solver change or physical acceptance. Run from the
package root with an explicit output file:

```sh
bun absolutejs/research/rotating-contact/support-probe.ts dist/rapier.mjs absolutejs/research/rotating-contact/result.json --subdivisions=1
```

A kinematic cuboid rotates against a frictionless dynamic sphere. An independent
quaternion-transform/box signed-distance oracle measures sphere separation; fresh
native shape queries must agree within 0.1mm. Four analytic oracle controls cover
face, interior, edge and rotated face. Static supports and prescribed rotations are
checked in every run. Sixty bounded cases cover 60/240/960Hz, signed angular speeds,
both insertion orders, and short/long faces. Default duration is at most 0.25s and
1.5 radians. The full-duration experiments are explicitly exploratory: long,
fast trajectories approach the engine speed cap and cannot isolate normal behavior.

Stored manifold normals lag the rotating face. The broad-face 60Hz/6rad/s case has
21.394mm geometric penetration while stored-anchor projection reports no negative
separation. At 960Hz/6rad/s it has 0.416mm actual penetration and 0.322mm projected
anchor penetration. Fresh native queries agree with the independent geometric
oracle; this is not just an envelope reconstruction artifact. The recorded normal
angle is an outer-step observation, not an internal Jacobian trace.

The no-fresh-query control verifies identical trajectories, proving the added
shape queries are observational for these fixtures. `summary.json` records the
case/frame count, source/engine hashes and observed speeds. All receipts were
regenerated from the committed probe source, including the exploratory controls.

`--subdivisions=2`, `4`, or `8` partitions each recorded interval into more world
steps while preserving 32 total configured solver subdivisions. For the broad-face
960Hz/6rad/s case, eight refreshes lower penetration from 0.416mm to 0.146mm. This
is not free: narrow-phase preparation, CCD scheduling and warm-start opportunities
also change. It is evidence for investigating contact refresh, not proof of a
single defective normal or a proposal to multiply all gameplay physics work.
The 30rad/s and 60Hz cases remain much worse. General rotation is unqualified.

Source inspection: Coulomb and twist builders gather current solver poses and
update anchor separation, but keep `constraint.dir1` and their prepared Jacobians.
Both store `local_n1` during generation without consuming it in the update path.
Changing only that normal would leave effective mass, torque/friction directions,
contact feature ownership and warm-start state inconsistent. Do not make that
partial solver patch. The game checkpoint refresh matrix tests whether these
controlled results transfer to the actual chip/cavity failures.

Further controls: `plane-oracle/` verifies the exact rotating plane/sphere
constraint and why normal-only transport retains incorrect surface witnesses.
`angular-audit/` records sphere spin with exact saved-trajectory parity and adds
32-refresh controls. Spin is small in the current fixture; full refresh reduces
but does not remove penetration. These findings narrow future experiments and do
not qualify a native solver change.
