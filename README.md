# AbsoluteJS Rapier 3D

A focused distribution of Rapier 0.21.0 / engine 0.36.0 with an additive
`World.solverContactPair` query. The engine's original geometric manifolds and its
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

`contactPair` retains its existing geometric behavior. No collision, integration,
clustering, mass, or solver parameters are changed. This is a diagnostic API
improvement, not a fix for the physical overlap reproduced in the game. Runtime
motion must still pass independent geometric and energy checks.

The ESM package includes WASM initialization and requires no separate asset URL.
Concurrent `init()` calls share initialization. This first release targets 3D f32
web/Node/Bun; it does not claim a 2D, f64, CommonJS or SIMD distribution.

## Build and provenance

Source base: dimforge/rapier commit
`b716d375efc0201003f0cd9ef7168eee0b62c177`. Upstream Apache-2.0 licensing is retained.
All engine source remains upstream; changes are confined to binding queries and
this package's build/test tooling.

Use Bun 1.4.4+absolute.1, Rust 1.94.0 with `wasm32-unknown-unknown`, and Python 3.12.
Run `bun install --frozen-lockfile`, then `bash absolutejs/scripts/build-native.sh`.
Cargo's exact lockfile is versioned, compilation is limited to two jobs, and the
wasm-bindgen 0.2.129 CLI archive is checksum verified before extraction. Caches and
generated build output are reproducible; modified source and selected test
receipts are committed. `dist/provenance.json` records the resulting WASM hash.

Run `bun test absolutejs/tests` after building. Tests compare the official pinned
release's motion against this build, exercise actual clustered contacts, nested
queries and exception cleanup. Browser-worker validation is separate from native
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
