# Private combined contact and rotation candidate

Do not publish this branch until it independently qualifies. It combines the canonical Parry witness correction with the previously rejected, separately measured gyro increment calculation. The contact-only build is preserved on `release/simplex-witnesses`; this branch adds one native arithmetic change. Stable and contact-only kernels keep their original energy behavior. No new native build has run on this branch yet.

The earlier gyro-only candidate improved force-free rotation but caused trajectories to encounter invalid cached contacts and failed game gates. Exact replay subsequently proved that the contact defect also exists in the stable kernel. The canonical witness correction resolves the captured contact; the combined branch must still pass full coupled game tests before the rotation correction can be accepted.

The copied free-spin tests/probe use analytic principal/isotropic solutions and an independently checked double-precision Euler/RK4 reference. The contact-query nonmutation tests compare queried and unqueried worlds under the same candidate kernel. Their former exact comparison with upstream is inappropriate for an intentional arithmetic change; the independent upstream-motion probe and force-free accuracy controls retain evidence of behavioral differences. No geometry or game contact/settling threshold changes are permitted.

All package, game, conservation and native reproducibility evidence must name this branch's actual WASM hash. Contact-only results do not qualify this combined kernel. Existing `native-kernel.json` still describes the contact-only candidate and must reject newly built bytes until they are explicitly identified for private testing.
