/** Private double-precision torque-free rigid reference. Not a production solver.
 * Body momentum uses implicit midpoint; attitude uses the matching Cayley map.
 * Finite bounded Newton iterations; nonconvergence throws rather than emitting a pose. */
export type V = [number, number, number];
export type Q = [number, number, number, number];
export type M = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const mv = (a: M, v: V): V => [
  a[0] * v[0] + a[1] * v[1] + a[2] * v[2],
  a[3] * v[0] + a[4] * v[1] + a[5] * v[2],
  a[6] * v[0] + a[7] * v[1] + a[8] * v[2],
];
const skew = (v: V): M => [0, -v[2], v[1], v[2], 0, -v[0], -v[1], v[0], 0];
const mm = (a: M, b: M): M =>
  Array.from({ length: 9 }, (_, i) => {
    const r = Math.floor(i / 3),
      c = i % 3;
    return (
      a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!
    );
  }) as M;
export const normalize = (q: Q): Q => {
  const n = Math.hypot(...q);
  if (!Number.isFinite(n) || n < 1e-15) throw Error("Invalid rotation");
  return q.map((v) => v / n) as Q;
};
export const multiply = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
export const rotate = (q: Q, v: V): V => {
  const u: V = [q[0], q[1], q[2]],
    t = scale(cross(u, v), 2);
  return add(add(v, scale(t, q[3])), cross(u, t));
};
export function solve(a: M, b: V): V {
  const rows = Array.from({ length: 3 }, (_, r) => [
    a[3 * r]!,
    a[3 * r + 1]!,
    a[3 * r + 2]!,
    b[r]!,
  ]);
  const magnitude = Math.max(...a.map(Math.abs));
  for (let c = 0; c < 3; c++) {
    let pivot = c;
    for (let r = c + 1; r < 3; r++)
      if (Math.abs(rows[r]![c]!) > Math.abs(rows[pivot]![c]!)) pivot = r;
    if (
      !Number.isFinite(rows[pivot]![c]) ||
      Math.abs(rows[pivot]![c]!) < 1e-15 * magnitude
    )
      throw Error("Singular reference solve");
    [rows[c], rows[pivot]] = [rows[pivot]!, rows[c]!];
    const value = rows[c]![c]!;
    for (let k = c; k < 4; k++) rows[c]![k]! /= value;
    for (let r = 0; r < 3; r++)
      if (r !== c) {
        const f = rows[r]![c]!;
        for (let k = c; k < 4; k++) rows[r]![k]! -= f * rows[c]![k]!;
      }
  }
  const x: V = [rows[0]![3]!, rows[1]![3]!, rows[2]![3]!];
  if (!x.every(Number.isFinite)) throw Error("Nonfinite reference solve");
  return x;
}
export function inverseInertia(inertia: M): M {
  if (inertia.length !== 9 || !inertia.every(Number.isFinite))
    throw Error("Invalid inertia");
  const mag = Math.max(...inertia.map(Math.abs));
  if (
    mag === 0 ||
    Math.abs(inertia[1] - inertia[3]) > 1e-12 * mag ||
    Math.abs(inertia[2] - inertia[6]) > 1e-12 * mag ||
    Math.abs(inertia[5] - inertia[7]) > 1e-12 * mag
  )
    throw Error("Nonsymmetric inertia");
  const l00 = Math.sqrt(inertia[0]),
    l10 = inertia[3] / l00,
    l20 = inertia[6] / l00,
    l11 = Math.sqrt(inertia[4] - l10 * l10),
    l21 = (inertia[7] - l20 * l10) / l11,
    l22 = Math.sqrt(inertia[8] - l20 * l20 - l21 * l21);
  if (![l00, l11, l22].every((v) => Number.isFinite(v) && v > 0))
    throw Error("Inertia is not positive definite");
  const columns = [
    solve(inertia, [1, 0, 0]),
    solve(inertia, [0, 1, 0]),
    solve(inertia, [0, 0, 1]),
  ];
  return Array.from(
    { length: 9 },
    (_, i) => columns[i % 3]![Math.floor(i / 3)]!,
  ) as M;
}
export type State = { rotation: Q; momentum: V };
export function midpointStep(
  state: State,
  inverse: M,
  h: number,
  maxIterations = 16,
) {
  if (
    !Number.isFinite(h) ||
    h === 0 ||
    Math.abs(h) > 1 ||
    !Number.isSafeInteger(maxIterations) ||
    maxIterations < 1 ||
    maxIterations > 32 ||
    !state.momentum.every(Number.isFinite)
  )
    throw Error("Invalid midpoint step");
  const q = normalize(state.rotation),
    j0 = state.momentum;
  let j: V = [...j0],
    iterations = 0,
    residual = Infinity;
  const tolerance = 1e-13 * Math.max(1, Math.hypot(...j0));
  let omega: V = [0, 0, 0];
  while (true) {
    const middle = scale(add(j0, j), 0.5);
    omega = mv(inverse, middle);
    const f = add(add(j, scale(j0, -1)), scale(cross(middle, omega), -h));
    residual = Math.hypot(...f);
    if (residual <= tolerance) break;
    if (iterations++ >= maxIterations)
      throw Error("Midpoint iteration budget exhausted");
    const o = skew(omega),
      mi = mm(skew(middle), inverse);
    const jacobian = o.map(
      (value, i) => (i % 4 === 0 ? 1 : 0) + h * 0.5 * (value - mi[i]!),
    ) as M;
    j = add(j, solve(jacobian, scale(f, -1)));
  }
  const increment = normalize([
    omega[0] * h * 0.5,
    omega[1] * h * 0.5,
    omega[2] * h * 0.5,
    1,
  ]);
  return {
    rotation: normalize(multiply(q, increment)),
    momentum: j,
    iterations,
    residual,
  };
}
export const energy = (j: V, inverse: M) => 0.5 * dot(j, mv(inverse, j));
export function rotationDistance(a: Q, b: Q) {
  const q = multiply(normalize(a), [-b[0], -b[1], -b[2], b[3]]);
  return 2 * Math.atan2(Math.hypot(q[0], q[1], q[2]), Math.abs(q[3]));
}
