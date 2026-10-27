# Independent plane/sphere constraint and derivative oracle

This is a mathematical control, not a Rapier solver candidate or a simulation acceptance result. It identifies what a consistent broad-face experiment must compute. `python3 absolutejs/research/rotating-contact/plane-oracle/verify.py` reproduces the hash-identified receipt without invoking an engine or GPU.

For outward plane normal `n`, sphere center `s`, plane body center `p`, plane offset `h`, and radius `r`, exact face separation is:

`c = n · (s-p) - h - r`

With `d=s-p`, its velocity derivative is:

`dc/dt = n · (v_s-v_p) + (n × d) · omega_p`

The sphere angular Jacobian is zero. Its orientation does not change its support function. The plane angular Jacobian includes normal rotation; retaining the derivative of a fixed-normal point pair is a different constraint. One thousand deterministic centered finite-difference cases agree within 4.4e-10; one thousand common rigid-rotation controls preserve separation within 2.3e-15.

## Why normal-only transport is insufficient

Start with normal `n0`, plane material witness `(x,h,0)` and sphere material witness `s-r*n0`. Rotate the plane and its normal by theta, while the sphere translates without rotating. Projecting these material witnesses on the new normal overestimates actual separation by `r*(1-cos(theta))`. The nearest sphere witness should instead be `s-r*n`.

For r=0.1m and theta=0.5rad, an exactly touching sphere falsely appears separated by 12.242mm. Retaining the old sphere arm also invents a 0.04794m normal torque arm; the true normal passes through the sphere center. For a unit-mass solid sphere against a prescribed plane, that false angular term reduces effective mass to about 63.5% of its correct value. This is a counterexample to treating a transported normal plus current material arms as a complete solution.

The receipt records six angles and three centers, checks the exact bias identity, and measures false torque and effective-mass ratio. No claim is made that these synthetic witnesses equal the package's actual recycled/rebased solver witnesses. Source inspection shows that the builders use rebased material anchors and prepared angular terms; measuring that exact runtime path still requires a trace or carefully scoped native experiment.

## Scope of the next native experiment

Use explicitly identified sphere/broad-face geometry, consistent shape support points, separation, normal and angular derivatives. Check both insertion orders, prescribed paths, static support, angular velocities and contact onset. Do not infer normal ownership from arbitrary body order. A sphere/plane-only success would not qualify curved/edge/general convex contacts, friction, restitution, warm starting, multi-point coupling, or chip/cavity dynamics. Preserve existing baseline and test results separately.
