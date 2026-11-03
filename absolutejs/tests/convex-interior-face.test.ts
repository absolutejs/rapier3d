import { cutFragmentFixture } from "./cut-fragment-fixture";
import cutFragment from "./fixtures/cut-fragment.json";
import { beforeAll, expect, test } from "bun:test";
import R from "@absolutejs/rapier3d";
beforeAll(async () => {
  await R.init();
});
function rotate(
  p: number[],
  q: { x: number; y: number; z: number; w: number },
) {
  const t = [
    2 * (q.y * p[2]! - q.z * p[1]!),
    2 * (q.z * p[0]! - q.x * p[2]!),
    2 * (q.x * p[1]! - q.y * p[0]!),
  ];
  return [
    p[0]! + q.w * t[0]! + q.y * t[2]! - q.z * t[1]!,
    p[1]! + q.w * t[1]! + q.z * t[0]! - q.x * t[2]!,
    p[2]! + q.w * t[2]! + q.x * t[1]! - q.y * t[0]!,
  ];
}
for (const units of [1, 100])
  test(`analytic box contact retains the deepest vertex across 96 rotations at units=${units}`, () => {
    const points = Float32Array.from(
      Array.from({ length: 32 }, (_, i) => {
        const y = 1 - (2 * (i + 0.5)) / 32,
          r = Math.sqrt(1 - y * y),
          a = i * 2.399963229728653;
        return [
          4 * r * Math.cos(a) * units,
          0.2 * y * units,
          r * Math.sin(a) * units,
        ];
      }).flat(),
    );
    for (let i = 0; i < 96; i++)
      for (const reverse of [false, true]) {
        const s = Math.sin((i * 0.065) / 2) / Math.sqrt(14),
          q = {
            x: Math.fround(s),
            y: Math.fround(2 * s),
            z: Math.fround(3 * s),
            w: Math.fround(Math.cos((i * 0.065) / 2)),
          };
        let low = Infinity;
        for (let j = 0; j < points.length; j += 3)
          low = Math.min(
            low,
            rotate(Array.from(points.slice(j, j + 3)), q)[1]!,
          );
        const world = new R.World({ x: 0, y: 0, z: 0 });
        try {
          world.integrationParameters.lengthUnit = units;
          const body = world.createRigidBody(
            R.RigidBodyDesc.dynamic()
              .setTranslation(0, 10 * units - low - 0.01 * units, 0)
              .setRotation(q),
          );
          const makeFloor = () =>
            world.createCollider(
              R.ColliderDesc.cuboid(10 * units, 10 * units, 10 * units),
            );
          const makeHull = () =>
            world.createCollider(
              R.ColliderDesc.convexHull(points)!.setDensity(1 / units ** 3),
              body,
            );
          const first = reverse ? makeHull() : makeFloor(),
            second = reverse ? makeFloor() : makeHull();
          world.step();
          let count = 0;
          world.contactPair(first, second, (m) => {
            count += m.numContacts();
            expect(Math.abs(m.normal().y)).toBeGreaterThan(0.999999);
          });
          expect(count, `rotation=${i}, reverse=${reverse}`).toBeGreaterThan(0);
          expect(count).toBeLessThanOrEqual(5);
        } finally {
          world.free();
        }
      }
  }, 30000);
for (const units of [1, 100])
  test(`finite box does not become an infinite plane at units=${units}`, () => {
    const world = new R.World({ x: 0, y: 0, z: 0 });
    try {
      world.integrationParameters.lengthUnit = units;
      const floor = world.createCollider(
        R.ColliderDesc.cuboid(units, units, units),
      );
      const body = world.createRigidBody(
        R.RigidBodyDesc.dynamic().setTranslation(2 * units, units, 0),
      );
      const points = Float32Array.from(
        [-0.1, -0.1, -0.1, 0.1, -0.1, -0.1, 0, 0.1, -0.1, 0, 0, 0.1],
        (v) => v * units,
      );
      const hull = world.createCollider(
        R.ColliderDesc.convexHull(points)!,
        body,
      );
      world.step();
      let count = 0;
      world.contactPair(floor, hull, (m) => (count += m.numContacts()));
      expect(count).toBe(0);
      expect(body.translation().x).toBe(2 * units);
    } finally {
      world.free();
    }
  });

test("captured cut fragment settles on a finite box without contact tuning", () => {
  const result = cutFragmentFixture(R, cutFragment.model);
  expect(result.final.sleeping).toBe(true);
  expect(result.seconds).toBeLessThan(20);
  expect(result.normals.maximumHorizontal).toBe(0);
  expect(result.final.linear).toEqual({ x: 0, y: 0, z: 0 });
  expect(result.final.angular).toEqual({ x: 0, y: 0, z: 0 });
}, 30000);
