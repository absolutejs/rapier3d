# Contact-frame diagnostics required before any candidate release

The native solver composes `ContactManifold::subshape_pos1/2` in pair_update,
and contact clustering explicitly transforms points into collider space.
The TypeScript raw geometric manifold accessors currently return stored
`local_p1/2`; no subshape pose accessor is exposed. Their existing semantics
must remain readable and must not be silently confused with collider-local data.

If whole-tree qualification accepts persistent heightfield frames:

1. Add explicit collider-local contact point accessors to the real Rust bindings
   and TypeScript API. Compose each stored subshape pose, using identity for an
   ordinary collider. Keep existing subshape-local accessors intact and document
   both coordinate systems. Solver contacts already report world-space anchors.
2. Test ordinary shapes plus translated/rotated composite subshapes and the exact
   heightfield fixture, both collider orderings, out-of-range/null and reusable
   output targets. Compare collider-to-world results against independent geometry
   and native solver contacts, not merely between two wrappers over the same data.
3. Update the game's saved-manifold exporter to label stored subshape-local and
   collider-local points distinctly. Keep historical evidence unchanged.
4. Qualify restored old and newly written snapshots without changing the snapshot
   layout. The existing manifold metadata already serializes the explicit frame.
5. Run package/browser/full-game and reproducibility checks before publishing.

The first private WASM archive is only for physical qualification and intentionally
contains no untested claim of corrected TypeScript contact-position inspection.
Canonical game stays on published 0.16.2 until an audited public release exists.
