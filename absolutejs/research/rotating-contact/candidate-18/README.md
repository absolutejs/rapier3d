# Candidate 18: tagged exact plane/sphere native experiment (bounded fixture improvement)

This private experiment uses explicit native rigid-body tags to select a prescribed kinematic plane and dynamic radius-0.1 sphere. Tags are only applied by `support-probe.ts --plane-oracle --broad-only`. It is not a general collider implementation and must never be released or adopted by the game.

The fixture has centered colliders, plane half-extents (20,.05,.5), zero friction/restitution, and one contact. The helper computes the exact top-face separation, current normal and plane angular derivative; the sphere angular derivative is zero. Both Coulomb and twist preparation paths update normal effective mass and the biased and post-integration relax separation. Padding lanes must remain inactive. An assertion rejects leaving the broad-face interior instead of silently treating a finite cuboid as an infinite plane.

Controls required before interpreting results: untagged trajectory parity, both body orders, static/separating/rotating cases, independent geometric distance oracle, prescribed path, sphere spin, and full research suite. A fixture-specific improvement does not qualify arbitrary shape features, friction, bounce, compound geometry or actual chip/cavity dynamics. The oracle body's tags do not validate collider dimensions; fixture construction and the independent finite-box oracle provide those checks.

The production package remains unchanged. The pre-experiment candidate-16 native and API are archived under `.absolutejs/candidate-16-body-query/` and prior committed source is `726a8e0`.

The baseline-tagged control applies the same body tags to the archived unchanged candidate-16 engine and must retain exact broad-fixture trajectories. This detects accidental fixture changes masquerading as a solver improvement. The experiment keeps the existing scalar impulse banking/warm-start policy; changing the normal between biased and relax passes can interact with that history. Passing this experiment would therefore still not constitute a complete transported-contact solver.


Result: all 30 tagged broad-face cases pass static/path/query-oracle controls. Untagged source reproduces all 4,284 baseline frames exactly, and tags alone on the old engine preserve the 2,142 broad-face frames. Peak forward-order depth at 960Hz/6rad/s drops from 0.4161mm to 0.01205mm; at 960Hz/30rad/s from 9.1386mm to 0.2649mm. The slow 60Hz case drops from 21.394mm to 0.1715mm. Residual penetration remains. Disabling warm starts barely changes these results, so scalar warm-start history is not established as the dominant residual cause. Full measurements, both orders and spin are in comparison.json and sensitivity.json.

The untagged full suite retains exactly 21 passes / four upstream-motion parity failures (48,827 assertions). This is not an all-tests-pass result or production qualification. Preserve this tagged experiment and extend to finite-box feature transitions separately; do not silently apply its plane assumptions to arbitrary colliders.
