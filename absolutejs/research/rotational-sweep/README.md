# Private rotational interval engine qualification

Base is published Rapier 0.16.3 receipt 16a3aa8 (game adoption 1826c324).
This isolated checkout prepares qualification of the Parry rotational interval
candidate. Pinning awaits its native feature/no-std checks. The zero native
identity is intentionally unqualified and must fail API packaging until a new
native payload is built and recorded for private tests. No release/adoption.

Intended scope: 3D orientation-changing direct sweeps use fixed separating-plane
motion bounds; unchanged orientations retain the original algorithm. No GJK
normal, persistent triangle frame or composite-CCD-bound experiment is included.
The collision query remains bounded at 25 distance queries and explicit Failed.
No game tolerances, solver budgets or material defaults change.

Before release consideration: native feature/no-std and direct-sweep fixtures,
package/browser tests, native game controls, paired 24 terrain cases, generated/
excavated requests, exact saved contact replay, full game suite, worker build,
CPU/WASM costs and independent native builds. Changes in physical outcomes must
be recorded, including any rejection. Composite traversal is a separate known
limitation and a corrected direct sweep does not establish full CCD correctness.

Parry is now pinned to native-qualified 627113c5cf9fc630d5ea2a727d77d89c1bc8114b.
Native selected suites pass 85/84/98/98 tests, plus both 3D no-std checks. The
432-case actual native matrix matches the private prototype exactly. Engine
qualification below remains pending. The earlier zero identity is intentional.
