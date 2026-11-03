import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const { default: R, buildInfo } = await import(resolve(process.argv[2]!));
await R.init();
const { model } = JSON.parse(
  readFileSync(new URL("./cut-fragment.json", import.meta.url), "utf8"),
);
const groundMode = process.argv[7] ?? "box32";
if (!["box32", "box4", "boxThin", "boxTall", "halfspace"].includes(groundMode))
  throw Error("Invalid ground control");
const units = 100,
  hz = Number(process.argv[4] ?? 1920),
  iterations = Number(process.argv[5] ?? 8),
  restitution = Number(process.argv[6] ?? 0.1);
if (
  ![480, 960, 1920, 3840, 7680].includes(hz) ||
  ![8, 16, 32].includes(iterations) ||
  ![0, 0.1].includes(restitution)
)
  throw Error("Unsupported bounded diagnostic control");
function rotated(p: number[], q: any) {
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
let lift = 2;
for (const f of model.colliders)
  for (let i = 0; i < f.solverPoints.length; i += 3) {
    const p = rotated(
      f.solverPoints.slice(i, i + 3).map((x: number) => x / units),
      f.rotation,
    );
    lift = Math.max(lift, -p[1]! - f.origin[1] + 2);
  }
const world = new R.World({ x: 0, y: -9.81 * units, z: 0 });
try {
  world.timestep = 1 / hz;
  world.integrationParameters.lengthUnit = units;
  world.integrationParameters.numSolverIterations = iterations;
  world.integrationParameters.staticContactSoftness = {
    naturalFrequency: 600,
    dampingRatio: 10,
  };
  world.integrationParameters.normalizedAllowedLinearError = 0.0001;
  world.integrationParameters.maxCcdSubsteps = 4;
  const floorDepth = groundMode === 'boxThin' ? 1 : groundMode === 'boxTall' ? 1000 : 100;
	const floorShape =
    groundMode === "halfspace"
      ? new R.ColliderDesc(new R.HalfSpace({ x: 0, y: 1, z: 0 }))
      : R.ColliderDesc.cuboid(
          groundMode === "box4" ? 400 : 3200,
          floorDepth,
          groundMode === "box4" ? 400 : 3200,
        ).setTranslation(0, -floorDepth, 0);
  const floor = world.createCollider(
    floorShape.setFriction(0.7).setRestitution(restitution),
  );
  const mass = model.materialMass;
  const desc = R.RigidBodyDesc.dynamic()
    .setTranslation(
      model.center[0] * units,
      (model.center[1] + lift) * units,
      model.center[2] * units,
    )
    .setCcdEnabled(true)
    .setCanSleep(true)
    .setAdditionalMassProperties(
      mass.massKg,
      { x: 0, y: 0, z: 0 },
      {
        x: mass.principal[0] * units ** 2,
        y: mass.principal[1] * units ** 2,
        z: mass.principal[2] * units ** 2,
      },
      mass.frame,
    );
  const body = world.createRigidBody(desc);
  let collider: any;
  for (const f of model.colliders)
    collider = world.createCollider(
      R.ColliderDesc.convexHull(Float32Array.from(f.solverPoints))
        .setTranslation(
          ...f.origin.map(
            (v: number, k: number) => (v - model.center[k]) * units,
          ),
        )
        .setRotation(f.rotation)
        .setDensity(0)
        .setFriction(0.7)
        .setRestitution(restitution),
      body,
    );
  body.recomputeMassPropertiesFromColliders();
  let steps = 0;
  const samples = [];
  const normals = {
    samples: 0,
    maximumHorizontal: 0,
    minimumUp: 1,
    last: null as any,
  };
  const energy = () => {
    const v = body.linvel(),
      w = body.angvel(),
      q = body.rotation(),
      f = body.principalInertiaLocalFrame(),
      i = body.principalInertia();
    const local = rotated([w.x, w.y, w.z], {
      x: -q.x,
      y: -q.y,
      z: -q.z,
      w: q.w,
    });
    const principal = rotated(local, { x: -f.x, y: -f.y, z: -f.z, w: f.w });
    const linear =
      (0.5 * body.mass() * (v.x * v.x + v.y * v.y + v.z * v.z)) / units ** 2;
    const angular =
      (0.5 *
        (i.x * principal[0]! ** 2 +
          i.y * principal[1]! ** 2 +
          i.z * principal[2]! ** 2)) /
      units ** 2;
    const potential = (body.mass() * 9.81 * body.translation().y) / units;
    return { linear, angular, potential, total: linear + angular + potential };
  };
  const energyAudit = {
    minimumLate: Infinity,
    maximumLate: -Infinity,
    maximumRiseFromLateMinimum: 0,
  };
  const state = () => ({
    position: body.translation(),
    rotation: body.rotation(),
    linear: body.linvel(),
    angular: body.angvel(),
    sleeping: body.isSleeping(),
  });
  while (steps < hz * 20 && !body.isSleeping()) {
    world.step();
    steps++;
    if (steps >= hz * 2) {
      const e = energy().total;
      energyAudit.minimumLate = Math.min(energyAudit.minimumLate, e);
      energyAudit.maximumLate = Math.max(energyAudit.maximumLate, e);
      energyAudit.maximumRiseFromLateMinimum = Math.max(
        energyAudit.maximumRiseFromLateMinimum,
        e - energyAudit.minimumLate,
      );
    }
    if (steps >= hz * 2)
      world.contactPair(floor, collider, (m: any) => {
        if (m.numContacts()) {
          const n = m.normal();
          normals.samples++;
          normals.maximumHorizontal = Math.max(
            normals.maximumHorizontal,
            Math.hypot(n.x, n.z),
          );
          normals.minimumUp = Math.min(normals.minimumUp, Math.abs(n.y));
          normals.last = n;
        }
      });
    if (steps % hz === 0)
      samples.push({
        seconds: steps / hz,
        ...state(),
        normal: normals.last,
        energy: energy(),
      });
  }
  const record = {
    buildInfo,
    scope:
      "one convex cut fragment against a cuboid floor; fixed material inertia",
    groundMode,
    units,
    hz,
    iterations,
    restitution,
    lift,
    steps,
    seconds: steps / hz,
    final: state(),
    normals,
    energyAudit,
    samples,
  };
  writeFileSync(process.argv[3]!, JSON.stringify(record, null, 2));
  console.log(
    JSON.stringify({
      packageVersion: buildInfo.packageVersion,
      steps,
      seconds: steps / hz,
      sleeping: body.isSleeping(),
    }),
  );
} finally {
  world.free();
}
