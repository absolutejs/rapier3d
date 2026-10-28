# AbsoluteJS Rapier 3D

A focused distribution of Rapier 0.21.0 / engine 0.36.0 with solver-contact
diagnostics, current-body geometry queries, accurate prescribed kinematics, and
corrected contact-witness and force-free rotation calculations. The engine's original geometric manifolds and its
clustered solver manifolds are distinct. The upstream JavaScript contact query
only exposes the former, which can have no solver-contact entries even when the
solver is resolving contact. This package exposes the latter separately.

```ts
import RAPIER from '@absolutejs/rapier3d';
await RAPIER.init();
world.solverContactPair(firstCollider, secondCollider, (manifold, flipped) => {
  for (let i = 0; i < manifold.numSolverContacts(); i++) {
    const point = manifold.solverContactPoint(i);
    const cachedDistance = manifold.solverContactDist(i);
    const separation = manifold.solverContactSeparation(i);
    const anchor1 = manifold.solverContactPoint1(i);
    const anchor2 = manifold.solverContactPoint2(i);
    // Copy values here. The callback view expires when the callback returns.
  }
});
```

The callback receives a restricted solver view: normal, count, point, distance,
friction, restitution, and tangent velocity. It does not promise original subshape
identifiers or geometric surface normals. The `flipped` convention matches
`contactPair`. Do not step, free, or mutate the world inside either callback.
Nested read-only solver queries are supported; callback exceptions release query
wrappers before propagating. Solver distances are the engine's cached contact
update distances, not a continuous or post-step exact penetration guarantee.

`contactPair` exposes geometric manifolds; `solverContactPair` exposes solver
manifolds. Version 0.6 improves velocity-driven kinematics. Version 0.8
corrects previous-simplex witness preservation and reduces force-free rotation
roundoff, as described below. Contact and CCD policy defaults remain unchanged.
Runtime motion still needs independent geometric and energy checks.

Version 0.8.1 refreshes articulated link velocities after final solver impulses
and uses the integrated link geometry for center-of-mass velocity offsets.
This fixes stale `linvel()`/`angvel()` state and inconsistent velocities on rotating
fixed assemblies. It does not change the restitution iteration budget or provide
a general energy-conservation guarantee for off-center articulated impacts.


The ESM package includes WASM initialization and requires no separate asset URL.
Concurrent `init()` calls share initialization. The package targets 3D f32
web/Node/Bun; it does not claim a 2D, f64, CommonJS or SIMD distribution.

## Build and provenance

Source base: dimforge/rapier commit
`b716d375efc0201003f0cd9ef7168eee0b62c177`. Upstream Apache-2.0 licensing is retained.
The distribution adds binding queries, package build/test tooling, and CCD profiler
timer wiring. Version 0.6 also evaluates velocity-driven kinematic poses directly
from each solver-pass origin. Version 0.8 additionally pins the corrected
Parry collision source and applies the gyroscopic momentum increment without
reconstructing the entire angular velocity through the inertia frame.

Use Bun 1.4.4+absolute.1, Rust 1.94.0 with `wasm32-unknown-unknown`, and Python 3.12.
Run `bun install --frozen-lockfile`, then `bash absolutejs/scripts/build-native.sh`.
Cargo's exact lockfile is versioned, compilation is limited to two jobs, and the
wasm-bindgen 0.2.129 CLI archive is checksum verified before extraction. Caches and
generated build output are reproducible; modified source and selected test
receipts are committed. `dist/provenance.json` records the resulting WASM hash.

API packaging verifies the post-bindgen native bytes against
`absolutejs/native-kernel.json` before writing the distribution. A shared Cargo
cache containing a research kernel therefore fails closed. Rebuild stable native
source after research builds. Do not update the qualification hash merely to make
a build pass: a changed kernel requires physical qualification and a recorded
release decision. API-only releases retain the qualified native hash.
See `absolutejs/research/native-build-guard/` for positive and negative controls.

The build copies this canonical documentation to the root README used by npm,
so published package documentation stays synchronized.

Run `bun test absolutejs/tests` after building. Tests compare queried and unqueried
worlds under the same kernel, exercise actual clustered contacts, nested queries,
exception cleanup, captured contact regressions and analytic rotation controls.
The independent upstream-motion probe records intentional trajectory differences;
exact old floating-point rounding is not a physical acceptance criterion. Browser-worker validation is separate from native
GPU performance testing; no GPU is required by the engine.

This is a maintained AbsoluteJS distribution, not an official Dimforge release.

## Live anchors and explicit clustering control (0.2)

`solverContactPoint1/2` return the native solver anchors transformed by current body
poses. `solverContactSeparation` projects their difference onto the stored world
solver normal. Negative means overlapping anchors; invalid indices return null.
Anchor values include contact skin and hook offsets, so they are not necessarily
points on the visible material surface. The normal is from the contact update;
this is not a new narrow-phase query or a continuous material penetration bound.
The old cached `solverContactDist` remains explicitly separate.

`world.integrationParameters.contactClustering` exposes the existing engine switch.
It defaults to true, exactly as upstream. Set it only between steps; disabling it
may increase solver workload and is not a general penetration fix. Snapshot restore
preserves the setting. The game is not instructed to turn it off by this release.

The independent every-step cube/cavity audit demonstrates the distinction: about
0.459mm current penetration is visible in live anchors when the cached distance is
zero. Disabling clustering retains about 0.469mm peak penetration in that case.
Neither extra telemetry nor changing clustering is presented as a physics cure.

`minCcdDt` exposes the engine's minimum CCD substep duration in seconds. Its
upstream default stays `1/60/100`, even when the outer timestep is changed.
The setter rejects negative, non-finite and f32-overflowing values. Smaller values
can introduce instability; changing it is an explicit experiment, not an automatic
quality preset. Both controls are retained through native snapshot serialization.

## Restored collider ownership (0.2.1)

Snapshot restoration now preserves `null` for an unowned collider's `parent()`.
Previously an absent native handle could be coerced to body zero during JavaScript
wrapper reconstruction. Real body-zero and fixed-body attachments remain intact.
This changes wrapper metadata only; native ownership, WASM and solver behavior are
unchanged. Repeated snapshot restoration and browser workers are regression tested.

## Actual CCD substeps (0.3)

Enable `world.profilerEnabled = true`, step the world, then read
`world.ccdSubsteps()`. It reports the native count of CCD passes in the last
completed profiled step, rather than the configured maximum. Zero means CCD did
not act, not that the world failed to advance. It returns null when unavailable:
before a profiled step, while profiling is disabled, or after toggling profiling
until a new step completes. Setting an already enabled profiler to true is idempotent.
Restored worlds start with profiling disabled and no sample. Event-enabled stepping
is covered too. This is opt-in telemetry; no physics policy or defaults change.
The counter does not expose individual substep durations or times of impact.

CCD timing now accumulates activation/impact-planning and motion-clamping work
across all passes in a step. The TOI timer also accumulates instead of resetting
for every clamp pass. Both are recorded only with profiling enabled. The timing
fix leaves contact equations and trajectories unchanged; package tests compare
profiled/unprofiled poses and official upstream trajectories.

## Contact policy controls (0.4)

The following existing native settings are now exposed through
`world.integrationParameters`. Defaults and solver algorithms are unchanged.

| Property | Default | Meaning |
| --- | --- | --- |
| `contactRecycling` | `true` | Reuse contact manifolds while relative poses stay within the native reuse bounds. |
| `normalizedContactRecycleDistance` | `0.05` | Relative-pose drift bound, multiplied by `lengthUnit`; zero prevents recycling. |
| `warmstartCoefficient` | `1` | Fraction of cached impulses reused by the solver, from zero to one. |

Change settings between simulation steps. The boolean setter rejects coercible
non-booleans; numeric setters reject non-finite/out-of-range input, including f32
overflow for the distance. Native snapshots preserve all three settings.

These controls support explicit diagnosis and application-specific qualification.
Disabling recycling increases contact-generation work and can change contact
features; disabling warm starting changes convergence. Neither is a general fix
for penetration. Evaluate the entire requested simulation horizon and geometric
intersections, alongside live/cached contact diagnostics. A process that exits
successfully after an early physical guard is not a completed physical test.


## Current-body shape contact queries (0.5.0)

```ts
const contact = firstCollider.contactColliderAtCurrentBodyPoses(secondCollider, 0);
```

This additive query composes each collider's local pose with its current parent
body pose. It observes direct body edits before the next world step without
propagating poses, stepping the simulation, or altering cached solver contacts.
Parentless colliders use their own world pose. The optional third argument reuses
a `ShapeContact` result. Prediction must be finite and nonnegative, in world units.

Use this for bounded explicit diagnostics, not every render/physics tick. It
allocates shape queries and returns a world-space native shape contact, not a
solver manifold, continuous sweep or authored-material overlap bound. Collision
filters, hooks and contact skin are not applied. Native unsupported shape pairs
can return null as well as separated pairs; null is not a general disjointness
proof. Existing `contactCollider` retains its stored-collider-pose semantics.

The distinction matters for rotating contacts: projecting current anchors onto a
stored normal can report no penetration while a fresh shape query finds overlap.
Both observations are useful, but answer different questions. Release 0.5.0 keeps
the 0.4.0 native kernel byte-for-byte unchanged; it does not include the private
relative-motion, EPA or clamp-graph solver experiments.


## Prescribed velocity-driven paths (0.6)

Velocity-driven kinematic bodies now evaluate their prescribed center-of-mass
translation and rotation from the start of each solver pass. This removes angular
phase error from repeatedly linearizing the prescribed rotation and limits
substep-dependent accumulation drift. Existing linear/angular speed caps still
apply. Dynamic bodies, position-driven endpoints, multibody integration and
soft-frame proxies retain their prior integration paths.

No API changes are required. This changes motion involving velocity-driven
kinematic bodies, including the contact response of bodies they touch. Floating
point rounding remains; this is not a general contact or continuous-collision
accuracy guarantee. Native qualification records, independent analytic path
controls, negative tests against 0.5.0, and bounded CPU observations are retained
in `absolutejs/research/kinematic-precision/`. The private tagged contact research
is excluded from this release.

Direct rotation evaluation adds CPU work for velocity-driven kinematic bodies.
Profile kinematic-heavy scenes; increasing solver subdivisions is not a free
accuracy improvement. The recorded CPU probes are not browser FPS guarantees.

Native builds use pinned Rust and wasm-bindgen versions and remap checkout/cache
paths to stable virtual prefixes before checking the qualified WASM checksum.
Custom compiler flags are preserved, but their output must still match the
qualified kernel. A checksum mismatch stops API packaging; it does not silently
adopt a different native solver.

## Lightweight build identity (0.7)

Version 0.7 adds package metadata without changing the qualified 0.6 native kernel. Package version and kernel release are deliberately separate fields. This release does not include the experimental gyroscopic increment correction; game contact regressions keep that native change under investigation.

```ts
import {buildInfo} from '@absolutejs/rapier3d/build-info';
report.physicsBuild = buildInfo;
```

The frozen metadata includes package version, qualified kernel release, native
WASM SHA-256/byte count, upstream/binding versions and whether the kernel changes the pinned upstream solver. The
same values are available as `RAPIER.buildInfo` and the root named `buildInfo`
export. Package and kernel releases can differ when an API-only upgrade reuses
a qualified kernel. The lightweight subpath contains metadata only and works
before `init()`. It reports the packaged kernel; supplying custom bytes to
`init(input)` does not change that identity and must be recorded separately.


## Contact witnesses and force-free rotation (0.8)

The collision dependency is pinned to `absolutejs/parry` revision
`dbd99a8dfce020da3698056471262435d56d3f69`, based on upstream 0.31.1.
Tetrahedron-to-face reduction now preserves support points needed by GJK's
previous-simplex calculation. Previously, an overwritten point could be combined
with its old barycentric weight, inventing a deep contact. A captured floor/hull
case reported -14.719921 cm despite separation; the corrected native replay
reports a small positive separation. Snapshot decoding and query read-only
behavior remain byte-exact. No contact tolerance, CCD default or game rejection
threshold is changed by this correction.

The rotation correction applies only the computed gyroscopic momentum increment.
Principal-axis and isotropic force-free bodies therefore avoid artificial spin-up
from repeatedly reconstructing the entire velocity through inertia and its inverse.
Genuine asymmetric precession remains active and is checked against a converged
double-precision Euler/RK4 reference.

In the recorded 336-case, 0.1-second free-spin matrix, worst relative energy error
falls from about 0.004033 to 0.000562. One tilted long-box control has about
1.305 ppm more energy error. These measurements cover specific shapes, rates and
iteration budgets; they are not a universal energy-error bound, a performance
claim, or a substitute for coupled-contact acceptance. f32 conditioning and time
integration errors remain.

`buildInfo.collisionLibraryVersion` and `buildInfo.collisionSource` identify the
exact locked collision library alongside the native WASM hash. They are lightweight
serialized strings and require no WASM initialization. Packaging rejects ambiguous
multiple Parry source entries. Release qualification evidence and retained experiment
results are recorded in `absolutejs/research/simplex-gyro/`.

## Articulation damping controls

`world.multibodyJoints.generalizedDamping(jointHandle)` returns an owned
`Float32Array` for the entire articulation containing that joint, including its
floating root. A removed joint returns `undefined`. These coefficients are
raw native coefficients, separate from rigid-body damping: native free angular generalized coordinates
default to `0.1` even when `RigidBody.setAngularDamping(0)` is used.
They are not dimensionless decay rates: angular coefficients act against inertia
in native world units. The same numeric coefficient need not produce the same
decay after changing the world length scale.

`setGeneralizedDamping(jointHandle, values)` returns `true` on success. It rejects
wrong lengths, negative/nonfinite values, native float overflow and removed
handles without mutation. Coordinate order is the native generalized order;
read the vector again after adding, removing or changing joints. The setter does
not wake sleeping bodies; wake the affected bodies explicitly. Neither method
changes the native default policy for newly created coordinates.

For an explicitly undamped diagnostic, read the vector, replace it with a zero
vector of the same length, and verify the readback. This is a diagnostic control,
not a recommendation to remove damping from every game mechanism.
