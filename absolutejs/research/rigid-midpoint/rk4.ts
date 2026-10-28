/** Independent classical RK4 reference for torque-free body momentum and attitude.
 * Only for step-refinement checks; it is not the conservation-preserving scheme. */
import {
  add,
  scale,
  cross,
  mv,
  multiply,
  normalize,
  type M,
  type State,
  type V,
  type Q,
} from "./reference";
export function rk4Step(state: State, inverse: M, h: number): State {
  const derivative = (s: State) => ({
    momentum: cross(s.momentum, mv(inverse, s.momentum)),
    rotation: multiply(s.rotation, [...mv(inverse, s.momentum), 0] as Q).map(
      (v) => v * 0.5,
    ) as Q,
  });
  const advance = (s: State, k: State, t: number): State => ({
    momentum: add(s.momentum, scale(k.momentum, t)),
    rotation: s.rotation.map((v, i) => v + t * k.rotation[i]!) as Q,
  });
  const a = derivative(state),
    b = derivative(advance(state, a, h * 0.5)),
    c = derivative(advance(state, b, h * 0.5)),
    d = derivative(advance(state, c, h));
  return {
    momentum: state.momentum.map(
      (v, i) =>
        v +
        (h / 6) *
          (a.momentum[i]! +
            2 * b.momentum[i]! +
            2 * c.momentum[i]! +
            d.momentum[i]!),
    ) as V,
    rotation: normalize(
      state.rotation.map(
        (v, i) =>
          v +
          (h / 6) *
            (a.rotation[i]! +
              2 * b.rotation[i]! +
              2 * c.rotation[i]! +
              d.rotation[i]!),
      ) as Q,
    ),
  };
}
