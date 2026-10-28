# Convergence-only candidate on published 0.9.0

Base 36b516975558acd79e7289a269e8fe4ab44b035b. Port only the bounded normal/rebound convergence and precise impulse accumulation from research checkpoint 7d8c5b9. Do not port experimental COM integration, generalized response refresh, current-anchor policy or mass-refresh changes. The three changed native files are generic_contact_constraint.rs, generic_contact_constraint_element.rs and staged_island_solver/worker.rs.

Ordinary-only and mixed/parallel paths keep the published one restitution sweep; the private research branch's unqualified mixed fixed-16 policy is excluded. The serial generic-only adaptive normal/rebound logic retains its explicit restrictions and 256 bound. Existing prepared Jacobians remain as in 0.9.0. This separation must be tested for regressions against published binaries; it is not yet a release or adoption. Package private=true until qualified.

All three newly added regression files come from the real package research source. No node_modules code is edited; the development dependency directory is shared read-only and native output/cache are checkout-specific.
