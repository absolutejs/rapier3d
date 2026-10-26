# Pinned Parry contact-precision research

parry3d is the complete upstream 0.31.1 crate, Apache-2.0 licensed (LICENSE
included). Archive SHA256: 7b626edc0b497dba4bdf6e1e0797895294ed9f61dac2bd28cb5d34d37ad2ca7e.
The sole implementation difference is EPA nonmonotone regression handling in
src/query/epa/epa3.rs: use the existing distance tolerance when comparing the new
face distance with the previous face distance. Near-zero rounding noise must not
return an old face with an opposite normal and centimetres of false penetration.

This is an unqualified research engine, not a published solver upgrade. The source
is kept in the package repository so builds need no game-local or temporary patch.
The game compound failure at step 479 reproduces in the unchanged f32 prescribed-
pose query; the candidate removes the large error across both order/cache controls.
Full dynamics and earlier regression matrices still determine qualification.
