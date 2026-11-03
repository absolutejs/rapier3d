# 0.21.2 qualification

The per-body CCD broadphase cache removes repeated same-body candidate walks.
It is bounded to 512 external leaves and falls back to the existing traversal
on overflow. Stored padded leaf bounds, leaf order, filters and cast math are
preserved. No persistent cache or solver-setting change is introduced.

305 package tests pass. The GPU-disabled browser worker also matches all ten
frozen 0.21.1 motion, event and hook sequences. Three Rust production-helper
tests cover 4,000 ordered queries, fat/touching bounds, capacity fallback and
removed/reused collider handles.

Six alternating full generated-terrain runs preserve exact trajectory hashes.
CCD time decreases 38–42%, total native step time 10–21% in this fixture.
This is CPU fixture evidence, not a hardware FPS claim. The fixture has no
mutual body contacts; separate moving-body tests cover those contacts.

Two independent native builds match all 53 distribution files byte-for-byte.
The exact publish archive passes file/native identity audit and all ten extracted
archive motion/event/hook scenarios. Archive SHA256:
`de2be249bd7923e2150c50c7db4090578aaa43316eb04aa05fa1973966d779d4`.

Publication is pending. The game remains on published 0.21.1 until registry
verification and adoption checks complete.
