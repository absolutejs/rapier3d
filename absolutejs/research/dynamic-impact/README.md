# Private two-body restitution convergence experiment

Based on published Rapier 0.8.0. The game probe captures a 3.99134 J increase from 14 J at the first off-center box collision; the matching upstream 0.21.0 run has the same first-impact energy. CCD toggles do not affect this fixture, frictionless controls retain the gain, and more temporal subdivisions do not remove it consistently.

The canonical solver performs one end-of-step restitution sweep. This private experiment repeats that sweep 16 times within each Coulomb/twist contact chunk. It tests whether within-chunk convergence contributes to the excess energy. It is not a complete multi-contact restitution algorithm: no global coupling, generic multibody convergence, friction restitution consistency, or energy guarantee is established. It must not be published or adopted in the game.

Source, build and runtime evidence live here; no installed dependency cache is patched. Compile with two jobs in this checkout's own target directory. The existing native checksum guard is expected to reject the new artifact until a separately labeled research identity is recorded.

## Local sweep result

The private WASM `262872baa26f283464bfb24fa7b0651ab8137839225e15d3c101708c74faa37a` removes positive box energy gain across the 108-case comparison, preserving analytic head-on sphere velocities. Oblique angular momentum error remains. In simultaneous three-body sphere collisions, final energy is only 5.91–6.44 J from 14 J at restitution 1, with insertion-order dependence; sixteen local sweeps barely affect those results. Three-body frictionless boxes lose 4.13–4.28 J. Local convergence is not a general multi-contact elastic solution. These results do not qualify the experiment for release.

The next isolated hypothesis repeats the entire color/overflow/generic restitution stage instead of each local chunk. The original local artifact is retained at `.absolutejs/impact-local16/rapier.mjs`; canonical source and hash permit rebuilding it.

## Global sweep result

Private graph-wide sixteen-sweep artifact `08ca14d345365fed5b29d8e572d0e03a7e15eb3efb8462da5f3fa85b98641421` preserves head-on analytic controls and removes positive box energy gain in the 108-case comparison. In simultaneous elastic sphere controls, it recovers the connected-constraint solution within 1.53e-7 m/s and retains 14 J. Frictionless three-box energy stays within 6.36e-6 J of 14 J. Frictional angular error and order dependence remain.

The new simultaneous-impact package regression fails on stable 0.8.0 and passes on the private candidate across timesteps/length units/insertion order. All 38 package tests pass (48,446 assertions). A complete game run is in progress in a separate checkout. Fixed-joint assemblies, performance cost and broader coupled constraints remain qualification gates. No public version or production policy is changed.

## Full game and assembly gates

The graph-wide candidate passes all 828 game tests, 7,408,613 assertions, with unchanged source; both isolated game type checks pass. The fixed-joint gate exposes a pre-existing coupling defect: equivalent compound spheres retain 20 J and exchange velocities, while the jointed assembly finishes at about 5.00–11.57 J in both stable and contact-only global candidates. Jointed bodies can disagree by up to 5 m/s immediately after impact. This keeps machinery qualification open.

The sequential first-impact benchmark alternates engine order on identical snapshots and verifies every intended pair has solver contacts. At 2/16/64 bodies, baseline medians are 0.279/0.417/1.193 ms and global-candidate medians 0.344/0.452/1.368 ms on this run. This is CPU step cost, not FPS; snapshot restore is excluded, and the 32 independent pairs do not establish dense-island scaling. The initial benchmark overlapped a type-check process and is explicitly unqualified.

Next private experiment: solve rigid/generic joint velocity constraints without bias or warm-start inside each global restitution sweep. Particle attachments/soft-body coupling and broad mechanism calibration are not covered by this narrowly scoped experiment.

## Coupled joint result and scaling failure

Private joint-coupled artifact `1a1a9733f6e4c53265a68d1627972e0c1331f9099dea3cde8fd7c5af8be6ebfe` (3,294,200 bytes; native source befa19c) passes 39 package tests / 48,590 assertions. The 12 compound/fixed-joint controls recover 20 J to within 6.2e-6 J and fixed-joint final speeds to within 4.8e-7 m/s. The new 12-configuration regression also reverses insertion order and fails stable 0.8.0. The two-body matrix retains the earlier box energy-gain fix; oblique angular error remains.

A new independent equal-mass chain oracle blocks release: collinear assemblies with 2/4/8/16 one-kilogram linked bodies hit an equally massive incoming sphere at opposite 2 m/s. Ideal rebound is -2 m/s for every assembly body and +2 m/s for the incoming sphere. Sixteen coupled sweeps work for two pieces, but sixteen-piece assemblies retain only 0.35–1.64 J of the initial 64 J. Final velocity error reaches 1.85 m/s. Creation-order reversal agrees for these fixtures. This is inadequate convergence, not a qualifying result for machinery. `joint-chain16` and `stable-chain` preserve every case, input hashes and completion receipts. No public adoption is authorized by these measurements.

Next research control: increase only the private restitution sweep count to determine whether the long-chain defect converges at all. A high fixed iteration budget is a diagnostic control, not a production performance solution. Soft attachment/cluster coupling remains unqualified.

## Reduced-coordinate assembly investigation

The multibody control initially assigned moving rigid-body velocities before forming the articulation. That is not equivalent initialization: the articulation has its own generalized velocity state. The original run is retained with `unqualified-initialization.json`; its momentum/energy mismatch is not evidence of a solver defect. Corrected controls use a stationary assembly and a -4 m/s incoming equal mass, with the correspondingly shifted analytic oracle (-4 m/s assembly, zero incoming).

The corrected published-engine multibody control reaches the analytic final velocities within 1.2e-7 m/s for 2/4/8/16 pieces with no linked-body velocity mismatch. However, body-reported momentum temporarily disagrees during impact. The captured 16-piece, 60 Hz case reports -32.0655 kg m/s at step 2 instead of -64. Its before/after snapshots replay exactly. Source inspection shows final generalized velocities are copied back after restitution, while linked rigid-body velocity refresh occurs earlier in substep integration. A separate minimal writeback experiment is warranted; final velocities alone do not validate all intermediate state. No multibody production adoption follows from this result.

## 256-sweep rejection and revised direction

Native `e2b920e14e6c56170bdbe8d10d4cb5ed7574855a03179ba8b90a2e4161cfef17` (3,294,201 bytes, source 9afcee2) increases only the private coupled sweep count to 256. It does not fix the assembly problem: eight-piece chains finish at 41.66–53.77 J from 32 J, and sixteen-piece chains at 120.73–125.49 J from 64 J. The earlier sixteen-sweep interpretation as merely inadequate convergence is therefore insufficient. More sweeps can amplify energy; neither candidate is acceptable for production. No full-game qualification or performance campaign is justified for this rejected variant.

The independent `research/multibody-writeback` branch starts from stable 0.8.0 and changes only final articulated velocity writeback. It retains the stable contact algorithm and sweep count. Qualify that narrow correction independently, rather than bundling it with the rejected impact experiments.

## References and assembly design implications

Consulted 2026-10-27: [Rapier's joint-constraint guide](https://rapier.rs/docs/user_guides/rust/joint_constraints/) distinguishes exact reduced-coordinate joint geometry from iterative impulse constraints. Articulations require tree topology; loop-closing impulse constraints can supplement them. Joint edits are costlier and explicit joint forces are unavailable. This supports evaluating compounds for intact rigid material, articulations for persistent tree-shaped mechanisms, and impulse constraints where editing, loops or force measurements require them. This is an architectural direction, not a validated gameplay conversion.

[Smith et al., Reflections on Simultaneous Impact (2012)](https://www.cs.columbia.edu/cg/rosi/rosi.pdf), sections 2–4 and 8, discusses energy, momentum, symmetry, break-away and unilateral impulse requirements, and the distinction between instantaneous impact and finite-step integration. Conservation alone does not uniquely select a general multi-impact outcome. Our simultaneous three-sphere result is a specified model control, not a universal law for all material collisions. The fixed rigid-assembly equal-mass rebound has a simpler independent oracle. Any future contact-algorithm change needs break-away, friction, symmetry and finite-step qualification, beyond the present head-on examples.
