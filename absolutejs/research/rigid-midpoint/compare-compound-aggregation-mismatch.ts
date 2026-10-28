import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  add,
  scale,
  mv,
  rotate,
  multiply,
  inverseInertia,
  midpointStep,
  energy,
  rotationDistance,
  type V,
  type State,
} from "./reference";
import { measure, vector, quat } from "./measurement";
const directory = resolve("absolutejs/research/rigid-midpoint");
const api = resolve(
  "../hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs",
);
const R = (await import(api)).default;
await R.init();
const hash = (p: string) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");
const paths = [
  import.meta.path,
  resolve(directory, "measurement.ts"),
  resolve(directory, "reference.ts"),
  api,
  resolve(directory, "native-comparison.json"),
];
const sources = Object.fromEntries(paths.map((p) => [p, hash(p)]));
const baseline = JSON.parse(
  readFileSync(resolve(directory, "native-comparison.json"), "utf8"),
);
const rows = [];
for (const fixture of baseline.rows) {
  const { units, hz, substeps, reverse } = fixture;
  const snapshotPath = resolve(
    directory,
    "snapshots",
    fixture.initialSnapshot.file,
  );
  if (hash(snapshotPath) !== fixture.initialSnapshot.sha256)
    throw Error("Snapshot hash mismatch");
  const assembly = R.World.restoreSnapshot(
    new Uint8Array(readFileSync(snapshotPath)),
  );
  const compound = new R.World({ x: 0, y: 0, z: 0 });
  try {
    const bodies: any[] = [];
    assembly.bodies.forEach((b: any) => bodies.push(b));
    if (bodies.length !== 3) throw Error("Unexpected body count");
    const initial = measure(bodies, units),
      w0 = vector(bodies[0].angvel()),
      assemblyRotation0 = quat(bodies[0].rotation());
    compound.lengthUnit = units;
    compound.timestep = assembly.timestep;
    compound.numSolverIterations = substeps;
    const body = compound.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(...scale(initial.com, units))
        .setCanSleep(false),
    );
    for (const b of bodies) {
      const relative = add(vector(b.worldCom()), scale(initial.com, -units));
      compound.createCollider(
        R.ColliderDesc.ball(0.1 * units)
          .setTranslation(...relative)
          .setMass(b.mass()),
        body,
      );
    }
    body.recomputeMassPropertiesFromColliders();
    const v0 = scale(initial.linear, units / initial.mass);
    body.setLinvel({ x: v0[0], y: v0[1], z: v0[2] }, true);
    body.setAngvel({ x: w0[0], y: w0[1], z: w0[2] }, true);
    const compoundInitial = measure([body], units);
    const relativeTensorError =
      Math.hypot(
        ...compoundInitial.inertia.map((v, i) => v - initial.inertia[i]!),
      ) / Math.hypot(...initial.inertia);
    const initialErrors = {
      mass: Math.abs(initial.mass - compoundInitial.mass),
      com: Math.hypot(...add(initial.com, scale(compoundInitial.com, -1))),
      linear: Math.hypot(
        ...add(initial.linear, scale(compoundInitial.linear, -1)),
      ),
      angular: Math.hypot(
        ...add(initial.angular, scale(compoundInitial.angular, -1)),
      ),
      energy: Math.abs(initial.kinetic - compoundInitial.kinetic),
      relativeTensor: relativeTensorError,
    };
    if (Object.values(initialErrors).some((v) => v > 1e-5))
      throw Error(`Compound physical initial state mismatch ${JSON.stringify({units,hz,substeps,reverse,initialErrors, initial, compoundInitial})}`);
    const inverse = inverseInertia(initial.inertia);
    let ref: State = {
      rotation: [0, 0, 0, 1],
      momentum: mv(initial.inertia, w0),
    };
    const max = () => ({ linear: 0, angular: 0, energy: 0, com: 0, angle: 0 });
    const assemblyMax = max(),
      compoundMax = max();
    for (let step = 1; step <= hz; step++) {
      assembly.step();
      compound.step();
      // Reference is deliberately much finer than either native integration.
      for (let j = 0; j < 16; j++)
        ref = midpointStep(ref, inverse, assembly.timestep / 16);
      for (const [list, start, maxima, rotation] of [
        [
          bodies,
          initial,
          assemblyMax,
          multiply(quat(bodies[0].rotation()), [
            -assemblyRotation0[0],
            -assemblyRotation0[1],
            -assemblyRotation0[2],
            assemblyRotation0[3],
          ]),
        ],
        [[body], compoundInitial, compoundMax, quat(body.rotation())],
      ] as const) {
        const measured = measure(list, units);
        maxima.linear = Math.max(
          maxima.linear,
          Math.hypot(...add(measured.linear, scale(start.linear, -1))),
        );
        maxima.angular = Math.max(
          maxima.angular,
          Math.hypot(...add(measured.angular, scale(start.angular, -1))),
        );
        maxima.energy = Math.max(
          maxima.energy,
          Math.abs(measured.kinetic - start.kinetic),
        );
        maxima.com = Math.max(
          maxima.com,
          Math.hypot(
            ...add(
              measured.com,
              scale(
                add(
                  start.com,
                  scale(start.linear, (step * assembly.timestep) / start.mass),
                ),
                -1,
              ),
            ),
          ),
        );
        maxima.angle = Math.max(
          maxima.angle,
          rotationDistance(rotation, ref.rotation),
        );
      }
    }
    for (const key of ["linear", "angular", "energy", "com"] as const)
      if (Math.abs(assemblyMax[key] - fixture.maxima[key]) > 1e-12)
        throw Error(`Assembly replay metrics differ: ${key}`);
    rows.push({
      units,
      hz,
      substeps,
      reverse,
      initialErrors,
      assembly: assemblyMax,
      compound: compoundMax,
    });
  } finally {
    assembly.free();
    compound.free();
  }
}
for (const p of paths) if (hash(p) !== sources[p]) throw Error("Input changed");
const result = {
  scope:
    "Equivalent compound rigid body versus published fixed articulation from the same saved physical initial states. Independent midpoint reference uses 16 substeps per outer step. No native changes.",
  engine: R.buildInfo,
  sources,
  rows,
};
writeFileSync(
  resolve(directory, "compound-comparison.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      cases: rows.length,
      maxima: Object.fromEntries(
        ["assembly", "compound"].map((kind) => [
          kind,
          Object.fromEntries(
            ["linear", "angular", "energy", "com", "angle"].map((key) => [
              key,
              Math.max(...rows.map((r) => (r as any)[kind][key])),
            ]),
          ),
        ]),
      ),
    },
    null,
    2,
  ),
);
