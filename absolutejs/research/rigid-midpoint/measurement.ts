import {
  add,
  scale,
  cross,
  dot,
  mv,
  multiply,
  normalize,
  rotate,
  type V,
  type Q,
  type M,
} from "./reference";
export const vector = (v: { x: number; y: number; z: number }): V => [
  v.x,
  v.y,
  v.z,
];
export const quat = (q: { x: number; y: number; z: number; w: number }): Q =>
  normalize([q.x, q.y, q.z, q.w]);
export function bodyTensor(body: any, units: number): M {
  const q = multiply(
    quat(body.rotation()),
    quat(body.principalInertiaLocalFrame()),
  );
  const values = scale(vector(body.principalInertia()), 1 / (units * units));
  const axes = (
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as V[]
  ).map((v) => rotate(q, v));
  return Array.from({ length: 9 }, (_, i) =>
    axes.reduce(
      (sum, a, k) => sum + values[k]! * a[Math.floor(i / 3)]! * a[i % 3]!,
      0,
    ),
  ) as M;
}
export function measure(bodies: readonly any[], units: number) {
  const mass = bodies.reduce((m, b) => m + b.mass(), 0);
  const com = scale(
    bodies.reduce(
      (c, b) => add(c, scale(vector(b.worldCom()), b.mass() / units)),
      [0, 0, 0] as V,
    ),
    1 / mass,
  );
  let linear: V = [0, 0, 0],
    angular: V = [0, 0, 0],
    kinetic = 0;
  const inertia = Array(9).fill(0) as M;
  for (const b of bodies) {
    const m = b.mass(),
      v = scale(vector(b.linvel()), 1 / units),
      w = vector(b.angvel()),
      r = add(scale(vector(b.worldCom()), 1 / units), scale(com, -1)),
      tensor = bodyTensor(b, units),
      p = scale(v, m);
    linear = add(linear, p);
    angular = add(angular, add(mv(tensor, w), cross(r, p)));
    kinetic += 0.5 * m * dot(v, v) + 0.5 * dot(w, mv(tensor, w));
    for (let i = 0; i < 9; i++)
      inertia[i]! +=
        tensor[i]! +
        m * ((i % 4 === 0 ? dot(r, r) : 0) - r[Math.floor(i / 3)]! * r[i % 3]!);
  }
  return { mass, com, linear, angular, kinetic, inertia };
}
