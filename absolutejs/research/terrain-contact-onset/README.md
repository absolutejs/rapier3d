# Terrain contact onset reduction

Base is published 0.17.0 delivery 9366e15. No production source changes.
Captured variant-5/960 failure is retained identically from 0.16.3; recycling
off removes the onset penetration in an ablation, while clustering off does
not. The following native query reduction inspects cached state and triangle
queries at current and last-recycle-base poses. No runtime setting is adopted.

Inputs: game research capture at 6bae0d16 under
hello-world-rotational-contact-qualification/docs/terrain-contact-continuation-2026-10-28/variant-5-960.

Native results isolate triangle 999. At the last full update's recorded pose,
fresh direct and full-trimesh queries find about 0.00999 cm positive separation
inside the 2 cm prediction distance. The stored manifold is empty and its
recycle window is nevertheless 2 cm. Current-pose queries then detect increasing
penetration over saved steps 877–879. Normal constraints do not explain the miss.

Reusing the **previous step's** cached direction reproduces the original empty
manifold at that last-update pose. Raw GJK returns Intersection with a 3D
simplex; the contact fallback returns NoIntersection(X). Fresh/current-cache
directions succeed, and recentering at a triangle vertex succeeds with all
directions. Thus the cached emptiness follows a numeric contact-query failure,
not a verified gap beyond prediction. No recycling-default change is adopted.

Final extraction (`gjk-queries.json`) contains raw classifications, current and
previous caches, fresh full-composite queries, constrained triangle queries,
recycle-base/current poses and origin controls. Earlier incremental reports
remain for diagnosis. Standalone regression work is in
~/alex/parry-terrain-contact-research, branch research/terrain-gjk-tetrahedron.
