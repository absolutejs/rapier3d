# Restored collider ownership fix

Collider.finalizeDeserialization previously passed an absent native parent handle
to RigidBodySet.get. In the pinned bindings that can resolve to body zero, so an
unowned floor reports the wrong JS parent after snapshot restoration. The binding
now explicitly retains null for absent handles while preserving real handle zero.

The new regression fails on 0.2.0 and passes after the fix. It covers an unowned
floor, body-zero dynamic attachment, fixed-body attachment and two successive
snapshot restorations. Native body collider membership remains consistent.

Qualification: 10 tests, 39,622 assertions, including exact motion parity against
upstream; strict consumer types; GPU-disabled browser worker verifying restored
floor and dynamic ownership plus live contact queries. The embedded WASM is
unchanged (91d68ed4f46fa1febbaf82abb7e8018150a3ad982560381df700e009997e6721).
There are no native solver, collision, mass or timing changes. This fixes observable
wrapper metadata; it does not claim to eliminate physical chip overlap.
