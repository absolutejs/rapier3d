/** Published-reference scenarios for candidate caching; no performance assertions. */
export const ccdCandidateModes = [
  "single",
  "pieces",
  "rotating",
  "moving",
  "sensor",
  "filtered",
  "disabled",
  "dense",
  "restored-edit",
  "translated-scaled",
] as const;
export function ccdCandidateFixture(R: any, mode: string) {
  const units = mode === "translated-scaled" ? 100 : 1;
  const origin =
    mode === "translated-scaled"
      ? { x: 4096 * units, y: 128 * units, z: -512 * units }
      : { x: 0, y: 0, z: 0 };
  let w = new R.World({ x: 0, y: 0, z: 0 });
  const events = new R.EventQueue(true);
  const handles: number[] = [];
  let hookCalls = 0;
  const trace: unknown[] = [],
    collisions: unknown[] = [];
  const hooks = {
    filterContactPair: () => {
      hookCalls++;
      return mode === "filtered" ? null : R.SolverFlags.COMPUTE_IMPULSE;
    },
    filterIntersectionPair: () => {
      hookCalls++;
      return true;
    },
  };
  try {
    w.timestep = 1 / 480;
    w.integrationParameters.lengthUnit = units;
    w.integrationParameters.maxCcdSubsteps = 4;
    const count = mode === "moving" ? 2 : 1;
    for (let id = 0; id < count; id++) {
      const body = w.createRigidBody(
        R.RigidBodyDesc.dynamic()
          .setTranslation(origin.x + id * 4 * units, origin.y, origin.z)
          .setCcdEnabled(true)
          .setCanSleep(false)
          .setLinvel((id ? -100 : 100) * units, 0, 0)
          .setAngvel({ x: 0, y: 0, z: mode === "rotating" ? 30 : 0 }),
      );
      handles.push(body.handle);
      const pieces = mode === "single" ? 1 : mode === "dense" ? 2 : 80;
      for (let i = 0; i < pieces; i++) {
        let shape;
        if (mode === "single" || mode === "dense")
          shape = R.ColliderDesc.ball(0.03 * units).setTranslation(
            0,
            mode === "dense" ? (i ? 20 : -20) * units : 0,
            0,
          );
        else {
          const x = (i % 5) * 0.04 * units,
            y = Math.floor(i / 5) * 0.04 * units,
            d = 0.03 * units;
          shape = R.ColliderDesc.convexHull(
            new Float32Array([x, y, 0, x + d, y, 0, x, y + d, 0, x, y, d]),
          );
        }
        if (!shape) throw Error("Candidate fixture shape rejected");
        w.createCollider(
          shape
            .setDensity(1 / units ** 3)
            .setActiveHooks(
              R.ActiveHooks.FILTER_CONTACT_PAIRS |
                R.ActiveHooks.FILTER_INTERSECTION_PAIRS,
            )
            .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
          body,
        );
      }
    }
    const wall = (x: number) =>
      R.ColliderDesc.cuboid(
        0.005 * units,
        100 * units,
        100 * units,
      ).setTranslation(origin.x + x * units, origin.y, origin.z);
    let target =
      mode === "moving"
        ? null
        : w.createCollider(
            wall(2)
              .setSensor(mode === "sensor")
              .setEnabled(mode !== "disabled")
              .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
          );
    if (mode === "dense")
      for (let i = 0; i < 513; i++)
        w.createCollider(
          R.ColliderDesc.cuboid(0.005, 0.01, 2).setTranslation(
            2,
            -19 + (i * 38) / 512,
            0,
          ),
        );
    for (let step = 0; step < 240; step++) {
      if (mode === "restored-edit" && step === 120) {
        const restored = R.World.restoreSnapshot(w.takeSnapshot());
        w.free();
        w = restored;
        w.removeCollider(w.getCollider(target.handle), true);
        target = w.createCollider(wall(6));
        for (const h of handles)
          w.getRigidBody(h).setLinvel({ x: 100 * units, y: 0, z: 0 }, true);
      }
      w.step(events, hooks);
      events.drainCollisionEvents((a: number, b: number, start: boolean) =>
        collisions.push([step, a, b, start]),
      );
      trace.push(
        handles.map((h) => {
          const b = w.getRigidBody(h),
            p = b.translation(),
            q = b.rotation(),
            v = b.linvel(),
            a = b.angvel();
          const row = [
            p.x,
            p.y,
            p.z,
            q.x,
            q.y,
            q.z,
            q.w,
            v.x,
            v.y,
            v.z,
            a.x,
            a.y,
            a.z,
          ];
          if (!row.every(Number.isFinite))
            throw Error("Nonfinite candidate fixture");
          return [...row, b.isSleeping()];
        }),
      );
    }
    const clearance = ccdCandidateWallClearance(mode, trace, units, origin.x);
    if (
      clearance !== null &&
      clearance < -w.integrationParameters.normalizedAllowedLinearError
    )
      throw Error(
        `Convex wall-plane overlap exceeds configured linear allowance: ${clearance}`,
      );
    const finalX =
      (w.getRigidBody(handles[0]).translation().x - origin.x) / units;
    if (
      ["single", "pieces", "rotating", "dense", "translated-scaled"].includes(
        mode,
      ) &&
      finalX >= 2
    )
      throw Error("Solid wall crossed");
    if (["sensor", "filtered", "disabled"].includes(mode) && finalX <= 2)
      throw Error("Nonblocking target stopped body");
    if (mode !== "disabled" && mode !== "single" && hookCalls === 0)
      throw Error("Fixture did not exercise hooks");
    return { mode, trace, collisions, hookCalls, finalX };
  } finally {
    events.free();
    w.free();
  }
}

/** Independent authored-vertex endpoint guard; this is not a continuous swept bound. */
export function ccdCandidateWallClearance(
  mode: string,
  trace: any[],
  units: number,
  originX: number,
): number | null {
  if (
    !["pieces", "rotating", "restored-edit", "translated-scaled"].includes(mode)
  )
    return null;
  const points: number[][] = [];
  for (let i = 0; i < 80; i++) {
    const x = (i % 5) * 0.04 * units,
      y = Math.floor(i / 5) * 0.04 * units,
      d = 0.03 * units;
    for (const p of [
      [x, y, 0],
      [x + d, y, 0],
      [x, y + d, 0],
      [x, y, d],
    ])
      points.push(p.map((v) => Math.fround(v) / units));
  }
  let minimum = Infinity;
  for (let step = 0; step < trace.length; step++) {
    const row = trace[step][0],
      qx = row[3],
      qy = row[4],
      qz = row[5],
      qw = row[6];
    const origin = (row[0] - originX) / units,
      wall = mode === "restored-edit" && step >= 120 ? 6 : 2;
    for (const [x, y, z] of points) {
      const ty = 2 * (qz * x! - qx * z!),
        tz = 2 * (qx * y! - qy * x!),
        tx = 2 * (qy * z! - qz * y!);
      const px = origin + x! + qw * tx + qy * tz - qz * ty;
      minimum = Math.min(
        minimum,
        wall - Math.fround(0.005 * units) / units - px,
      );
    }
  }
  return minimum;
}
