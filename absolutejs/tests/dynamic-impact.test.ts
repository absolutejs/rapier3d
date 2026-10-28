import { beforeAll, expect, test } from 'bun:test';
import R from '@absolutejs/rapier3d';

beforeAll(async () => { await R.init(); });

test('unequal moving spheres obey the analytic impact law across units, ordering and timesteps', () => {
  for (const hz of [60, 240, 960]) for (const units of [1, 100])
    for (const reverse of [false, true]) for (const restitution of [0, 0.5, 1]) {
      const world = new R.World({ x: 0, y: 0, z: 0 });
      try {
        world.timestep = 1 / hz;
        world.lengthUnit = units;
        world.numSolverIterations = 4;
        const bodies: R.RigidBody[] = [];
        for (const index of reverse ? [1, 0] : [0, 1]) {
          const sign = index === 0 ? -1 : 1;
          const body = world.createRigidBody(R.RigidBodyDesc.dynamic()
            .setTranslation(sign * 0.65 * units, 0, 0)
            .setLinvel(-sign * 2 * units, 0, 0)
            .setCanSleep(false).setCcdEnabled(true));
          world.createCollider(R.ColliderDesc.ball(0.25 * units)
            .setMass(index === 0 ? 2 : 5).setFriction(0)
            .setRestitution(restitution), body);
          bodies[index] = body;
        }
        for (let step = 0; step < hz / 2; step++) world.step();
        const a = bodies[0]!.linvel().x / units;
        const b = bodies[1]!.linvel().x / units;
        // Two-body impulse law: masses 2/5 kg, incoming velocities +2/-2 m/s.
        expect(Math.abs(a - (-6 - 20 * restitution) / 7)).toBeLessThan(3e-6);
        expect(Math.abs(b - (-6 + 8 * restitution) / 7)).toBeLessThan(3e-6);
        expect(Math.abs(2 * a + 5 * b + 6)).toBeLessThan(1e-5);
        const expectedEnergy = 14 - 0.5 * (10 / 7) * (1 - restitution ** 2) * 16;
        expect(Math.abs(a * a + 2.5 * b * b - expectedEnergy)).toBeLessThan(2e-5);
        for (const body of bodies) {
          expect(Math.hypot(body.angvel().x, body.angvel().y, body.angvel().z)).toBeLessThan(1e-6);
          expect(Math.hypot(body.linvel().y, body.linvel().z) / units).toBeLessThan(1e-6);
        }
      } finally { world.free(); }
    }
});
