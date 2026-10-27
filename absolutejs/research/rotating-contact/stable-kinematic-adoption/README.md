# Stable prescribed-motion correction and remaining contact error

Compare the untagged stable 0.5.0 and qualified/published 0.6.0 engines with the
same bounded `support-probe.ts` source. This is a moving-contact observation, not
acceptance of the private tagged solver or general contact accuracy.

All 60 configurations complete. Static control frames remain identical. Across
moving cases, the largest depth regression is 0.744 micrometers and the largest
improvement is 19.292 micrometers. At the long-box / 6rad/s support, maximum
penetration remains approximately 21.390mm at 60Hz, 2.095mm at 240Hz and 0.416mm
at 960Hz. Correcting the prescribed path therefore does not remove the contact
feature/normal and endpoint-clamping defects already isolated in this research.

Each input records actual engine/probe hashes, policy, frame count, body states,
fresh native contacts and independent box-distance observations. `summarize.py`
checks matching configurations and complete frame counts before comparing them.
The engines are explicit command arguments; these records never depend on
whatever private native artifact happens to be in `dist/` later.

The next physical control should give both finite bodies dynamic mass and test
linear/angular momentum and kinetic energy, instead of relying only on a driven
support. The current tagged oracle excludes friction, restitution, arbitrary
collider offsets and general meshes; it remains private research.
