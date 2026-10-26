# Candidate 8: complete earliest-hit participant sets

Real cast hits equal to the current maximum fraction are retained across convex,
moving-compound, and nonlinear paths. Separated cast status is explicitly rejected.
The sweep keeps all equal-earliest target bodies; wake handles are sorted and
deduplicated before mutation. Initial-overlap policy is unchanged.

All 12 simultaneous scenarios now pass (2/4/8 sleeping targets, both kinematic kinds,
both creation orders). The combined narrow gate also passes 12 three-step kinematic
cases, 6 prescribed translation/rotation paths, 5 filter controls, 36 scale/order/frame
cases and 135 dynamic sphere controls, with matching engine identities. Three
near-end impacts preserve the exact prescribed endpoint after tiny time remainders
merge. Twenty shape observations add boxes, capsules, cylinders and cones: no head-on
crossing for the symmetric shapes; cone contact is oblique and X-order reversal alone
is not a tunneling metric. Full positions/velocities are retained.

Unmodified package suite: 11 pass, 2 existing upstream trajectory-parity failures,
47,258 assertions. Strict probe type checks pass. No physical threshold was weakened.
Default contact softness still gives 0.03105 normalized penetration in the sphere
case. Recorded frequency/iteration interventions are not runtime policy.

The bounded CPU/WASM no-impact cost probe (no compiler running) exposes extra work:
1,000 awake stationary targets + one fast kinematic body costs median 4.26ms versus
1.66ms in the release control in this sample. Sleeping targets cost roughly 0.55ms.
These are noisy CPU observations, not native browser/GPU FPS or a performance pass.
Next experiment skips transient swept-tree entries for exactly unchanged body poses;
the unchanged targets remain queryable through the existing broadphase.

Still unreleased/private in package.json. Cavity overlap, cap-one response, full
rotational/shape/simultaneous variation, cost scaling and production gates remain.
