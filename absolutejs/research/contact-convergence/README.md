# Convergence-only candidate on published 0.9.0

Base 36b516975558acd79e7289a269e8fe4ab44b035b. Port only the bounded normal/rebound convergence and precise impulse accumulation from research checkpoint 7d8c5b9. Do not port experimental COM integration, generalized response refresh, current-anchor policy or mass-refresh changes. The three changed native files are generic_contact_constraint.rs, generic_contact_constraint_element.rs and staged_island_solver/worker.rs.

Ordinary-only and mixed/parallel paths keep the published one restitution sweep; the private research branch's unqualified mixed fixed-16 policy is excluded. The serial generic-only adaptive normal/rebound logic retains its explicit restrictions and 256 bound. Existing prepared Jacobians remain as in 0.9.0. This separation must be tested for regressions against published binaries; it is not yet a release or adoption. Package private=true until qualified.

All three newly added regression files come from the real package research source. No node_modules code is edited; the development dependency directory is shared read-only and native output/cache are checkout-specific.

## Candidate qualification

Native SHA256 `05237bc7c173763fc740d80f6440130e548743c02083542370f17bb3061bf1e3`, 3,297,267 bytes. All 165 package tests / 76,909 assertions pass. GPU-disabled Chromium passes the existing worker suite plus six repeated coupled-impact cases. The game records 486 mass-ratio cases, 144 coupled PGS comparisons, 144 isolated/friction comparisons, and 80 exactly unchanged free-motion controls. Its broad run passed 828 tests but exceeded the terrain fixture setup's 15-second allowance; the four skipped terrain tests pass separately with a bounded 60-second setup allowance and unchanged assertions. Original failure logs are retained.

Game evidence: `hello-world/docs/convergence-only-qualification-2026-10-28/`. Its 32-island snapshot audit found inherited serialized-byte permutations on repeated restoration in both published and candidate kernels. Benchmark qualification therefore distinguishes exact physical-state repeatability from full internal binary identity. Failed preliminary benchmark attempts are retained. No change to snapshot serialization is included here.

The 1/8/32-island benchmark records candidate median CPU step costs 0.62/2.48/7.87 ms (p95 1.06/4.09/17.65 ms). It is a deliberately difficult 20/1/20 kg collision, not a general scene forecast. Restricting iteration scope and preserving minimum configured counts is intentional. Do not describe the change as a speedup.

Release metadata is being prepared for 0.10.0. Independent native rebuild, final archive audit and npm publication must be verified separately; this record does not assert publication or game adoption.
