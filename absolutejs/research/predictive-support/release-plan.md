# Isolated predictive-support release decision

Candidate scope is the two production files recorded in source-evidence.json.
Published Parry c566aabd is unchanged. No GJK-normal, triangle-frame or CCD
experiment is eligible for this release.

Completed before promotion:
- Strict old-reducer failure and five corrected native helper controls.
- 236 package tests, nine public support/replay regressions and CPU-only browser.
- 844 game tests, types, dependencies and worker bundle.
- 24 paired tree/terrain cases: no new rejection; existing raw variant-0/1920
  rejection remains. Four actual terrain work requests and 18 flat-tree cases pass.
- Native one/two-worker controls and allocation-enabled no-std.
- Bounded paired CPU samples, with physical controls and full samples retained.

Outstanding before promotion: independently rebuilt native and all distribution
bytes must match. Release readiness additionally requires auditing the actual public archive.
Canonical adoption requires registry verification of those same bytes.
The user's standing release authorization applies; npm may require interactive
account confirmation.

After independent build passes, promote identity to 0.16.3 without changing
native source. Audit private/public archive equivalence, then public identity,
focused support tests and the CPU-only browser. Back up the exact public archive
and source before invoking npm. Verify registry bytes before canonical adoption.

Known limits: this correction does not certify continuous material separation,
fix the recorded heightfield rejection, or fix nonmonotonic rotational sweeps.
No contact tolerance, solver budget, friction or restitution default changes.
No public API or snapshot layout changes. CPU observations are not browser FPS.

Independent build and public archive qualification have now passed; see
reproducibility.json, independent-release-audit.json, release-equivalence.json,
release-pack-audit.json, release-focused-tests.log and release-browser-result.json.
The earlier outstanding-build paragraph records the pre-promotion gate.
