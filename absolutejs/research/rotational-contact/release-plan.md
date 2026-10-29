# Combined rotational/contact candidate release gates

Proposed release: 0.17.0. Public API and snapshot layout remain unchanged;
the collision algorithm changes merit a minor release. Native Parry 8c68a62
combines the rotational interval fix with bound-associated GJK normals.
No composite sweep-bound or persistent triangle-frame experiment is included.

Completed: direct sweep 432-case exact comparison, original sweep controls,
captured seeded normal and old heightfield fixtures, four native dimensional/
numeric selected feature configurations and 3D no-std checks. Private package
and GPU-disabled browser pass. The exact saved failing oak step is corrected,
its full excavation test passes, all 844 game tests pass, and 24 tree/rate cases
introduce no new rejection. Four generated/excavated requests and 18 flat-tree
cases pass. Physics types, dependency resolution and worker build pass.

Remaining: permanent package fixture test; native engine one/two-worker support
controls and no-std; bounded paired CPU observations; independent native and
distribution rebuild; exact public/private equivalence; public identity and
browser checks. Then back up source and exact public archive before npm.
Canonical adoption requires registry verification. No publication yet.

Known limitation: raw variant-5/960 terrain clearance rejection is unchanged.
No claim of universal continuous material separation, browser FPS, or complete
composite broad-phase CCD correctness. Original tolerances/budgets unchanged.

## Promotion decision

All pre-promotion gates passed: 237 package tests, full 844-game suite,
native one/two-worker controls, no-std, paired CPU observations and independent
build. Correctness cost on the targeted tilted patch is explicitly retained
in cost-summary.json and package documentation. The standard build command
now defaults to one compiler job while respecting CARGO_BUILD_JOBS overrides;
all qualifying builds already used one job and shell syntax validation passes.

Public 0.17.0 archive audit and private/public equivalence pass. All runtime
and declaration bytes differ only in the two identity labels. Independent
public API build matches every shipped distribution file. Eleven focused
public-package tests and GPU-disabled browser checks pass. The isolated game
install matches all 53 archive files and both kerf worker tests pass.

Exact public archive SHA-256:
7a8fb479e8d14a43a859b8800e19207b891d0323e59d2cf26cf99e8638b68c30.
Publication and canonical registry adoption remain outstanding.
