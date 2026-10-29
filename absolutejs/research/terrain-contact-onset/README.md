# Terrain contact onset reduction

Base is published 0.17.0 delivery 9366e15. No production source changes.
Captured variant-5/960 failure is retained identically from 0.16.3; recycling
off removes the onset penetration in an ablation, while clustering off does
not. The following native query reduction inspects cached state and triangle
queries at current and last-recycle-base poses. No runtime setting is adopted.

Inputs: game research capture at 6bae0d16 under
hello-world-rotational-contact-qualification/docs/terrain-contact-continuation-2026-10-28/variant-5-960.
