# Private coupled restitution convergence experiment

Remove the rejected contact-local work ledger and restore the e88a852 response-refresh law. Retain the analytic head-on tests. For single-group worlds containing generic contacts, perform 16 end-of-step restitution sweeps through all ordinary and generic contacts; ordinary-only worlds retain exactly one. Keep prepare-time targets, late timing, activation and stabilization unchanged. This isolates convergence/order error from the independent evolving-geometry energy mismatch.

Unqualified diagnostic budget; not a release candidate. Coupling to non-bouncy contacts, joint constraints, refreshed mass, activation, cost and zero-restitution behavior remain open. Saved rejected build: .absolutejs/contact-work-restitution-dist. Game remains on published 0.9.0.

Native SHA256 6cc2392f4d6fca9f0c5c2ec140c640c43c90aed679cf568a2bbe24547eb318a4, 3,300,717 bytes. Build: 3m52s, two jobs. Full suite with coupled regression: 93 pass, 60,637 assertions; the saved response baseline fails 16 positive-restitution cases and passes 8 zero-restitution cases of that new regression.

144 coupled runs independently vary compression iterations (1/4/16) and late restitution sweeps (1/16). Only the 16/16 combination passes every symmetric gate. 144 isolated/friction comparisons preserve all 48 required unaffected pairs; isolated elastic geometry-energy error remains about 0.00971 J. 324 unequal-mass native runs show fixed 16 sweeps are insufficient: worst velocity error improves from 4.73059 to 0.777530 m/s, but does not meet the oracle. Maximum added energy in the sweep candidate is 0.0000254313 J.

A separate 648-case scalar convergence study needs up to 150 sweeps for 1e-5 m/s residual (median 11). Fixed 16 is therefore not a suitable general convergence policy. Next private experiment: bounded residual-based iteration in the single-worker generic-only path, retaining this exact build for comparisons. Game remains on 0.9.0. Detailed evidence is in Hello World docs/coupled-restitution-sweeps-2026-10-28.
