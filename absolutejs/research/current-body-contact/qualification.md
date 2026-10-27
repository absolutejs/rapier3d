# Rapier 0.5.0 additive current-body-pose query

Adds Collider.contactColliderAtCurrentBodyPoses using existing native shape queries, composing current parent and local collider transforms without changing stored collider poses or stepping the world. The result is an allocating native shape contact; filters, hooks and skin are not applied. Null can mean separated or unsupported. This is not a continuous/material separation guarantee.

The stable native kernel was rebuilt from this checkout and exactly matches published 0.4.0: SHA-256 65ebc43d69dc3b4b290b29ca30ff44955711c8002799503749bcc03060783b39. No research CCD, EPA, phase trace or clamp-graph changes are included.

All 22 package tests pass with 48,008 assertions. New tests cover unpropagated edits, noncommuting parent/child rotations, parentless and restored colliders, prediction validation, removed colliders, result ownership/reuse, unchanged snapshots and subsequent motion. Strict public types pass. The bounded GPU-disabled Chromium worker exercises the new query and existing contact/policy/CCD diagnostics.

The packed 0.5.0 tarball passes all three new tests (24 assertions) and strict type checks. The packed bundle equals the built bundle and retains the exact stable native hash. Pack contents and integrity are in pack.json; SHA-256 receipts are in packed-provenance.json. The initial pack attempt failed because npm's default cache was read-only; rerunning with the durable checkout cache succeeded.

Game adoption is prepared separately in hello-world/docs/rapier-current-body-contact-2026-10-27, including an explicit bounded fresh-pair budget and snapshot/query semantics. The game must adopt the published registry version, not a file dependency or node_modules patch.

Publication completed after npm browser confirmation. Registry integrity and SHA-1 match the exact tested tarball; see registry-verification.json. The game installed registry 0.5.0 and verified the installed bundle hash and native kernel hash before applying its bounded inspector change.
