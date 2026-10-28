import { beforeAll, expect, test } from "bun:test";
import type RAPIER from "@absolutejs/rapier3d";
import {
  type V,
  rotate,
  unit,
  vector,
} from "../research/gyroscopic-precision/free-spin-math";
const R: typeof RAPIER = (
  await import(process.env.RAPIER_TEST_ENGINE ?? "@absolutejs/rapier3d")
).default;
beforeAll(async () => {
  await R.init();
});
const positions: V[] = [
  [0, 0, 0],
  [0.65, 0.15, 0.1],
  [0.2, 0.5, -0.1],
];
const masses = [2, 3, 4];
function expectedTensor(points: V[], count: number) {
  const mass = masses.slice(0, count).reduce((a, b) => a + b, 0);
  const com = [0, 1, 2].map(
    (axis) =>
      points
        .slice(0, count)
        .reduce((sum, p, i) => sum + p[axis]! * masses[i]!, 0) / mass,
  ) as V;
  const tensor = Array(9).fill(0) as number[];
  for (let i = 0; i < count; i++) {
    const r = points[i]!.map((x, k) => x - com[k]!) as V;
    const squared = r.reduce((s, x) => s + x * x, 0);
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++)
        tensor[3 * row + col]! +=
          masses[i]! *
          ((row === col ? 0.4 * 0.1 * 0.1 + squared : 0) - r[row]! * r[col]!);
  }
  return { mass, com, tensor };
}
for (const count of [2, 3])
  test(`${count} collider masses preserve the physical inertia tensor across size and insertion order`, () => {
    const orders =
      count === 2
        ? [
            [0, 1],
            [1, 0],
          ]
        : [
            [0, 1, 2],
            [0, 2, 1],
            [1, 0, 2],
            [1, 2, 0],
            [2, 0, 1],
            [2, 1, 0],
          ];
    for (const units of [0.001, 1, 100, 10000])
      for (const turn of [0, 1, 2])
        for (const order of orders) {
          const q = unit([0.2 + 0.1 * turn, 0.3, 0.1, 0.9]);
          const points = positions.map((p) => rotate(q, p));
          const expected = expectedTensor(points, count);
          const w = new R.World({ x: 0, y: 0, z: 0 });
          try {
            w.lengthUnit = units;
            const body = w.createRigidBody(R.RigidBodyDesc.dynamic());
            for (const index of order) {
              const p = points[index]!;
              w.createCollider(
                R.ColliderDesc.ball(0.1 * units)
                  .setTranslation(p[0] * units, p[1] * units, p[2] * units)
                  .setMass(masses[index]!),
                body,
              );
            }
            body.recomputeMassPropertiesFromColliders();
            const principal = vector(body.principalInertia()).map(
              (v) => v / (units * units),
            );
            const frame = body.principalInertiaLocalFrame();
            const rotation = unit([frame.x, frame.y, frame.z, frame.w]);
            const axes = (
              [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ] as V[]
            ).map((v) => rotate(rotation, v));
            const actual = expected.tensor.map((_, i) =>
              axes.reduce(
                (sum, axis, k) =>
                  sum + principal[k]! * axis[Math.floor(i / 3)]! * axis[i % 3]!,
                0,
              ),
            );
            const relative =
              Math.hypot(...actual.map((v, i) => v - expected.tensor[i]!)) /
              Math.hypot(...expected.tensor);
            expect(relative).toBeLessThan(3e-6);
            expect(body.mass()).toBeCloseTo(expected.mass, 5);
            expect(
              Math.hypot(
                ...vector(body.localCom()).map(
                  (v, i) => v / units - expected.com[i]!,
                ),
              ),
            ).toBeLessThan(2e-7);
          } finally {
            w.free();
          }
        }
  });
