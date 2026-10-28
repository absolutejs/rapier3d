import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  add,
  scale,
  cross,
  dot,
  mv,
  multiply,
  normalize,
  rotate,
  inverseInertia,
  midpointStep,
  rotationDistance,
  energy,
  type V,
  type Q,
  type M,
  type State,
} from "./reference";
const api = resolve(
  process.env.RIGID_REFERENCE_ENGINE ??
    "../hello-world/node_modules/@absolutejs/rapier3d/dist/rapier.mjs",
);
const R = (await import(api)).default;
await R.init();
const hash = (p: string) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");
const sources = [
  import.meta.path,
  resolve("absolutejs/research/rigid-midpoint/reference.ts"),
  api,
];
const inputHashes = Object.fromEntries(sources.map((p) => [p, hash(p)]));
const snapshotDirectory = resolve(
  "absolutejs/research/rigid-midpoint/snapshots",
);
mkdirSync(snapshotDirectory, { recursive: true });
const vector = (v: { x: number; y: number; z: number }): V => [v.x, v.y, v.z];
const quat = (q: { x: number; y: number; z: number; w: number }): Q =>
  normalize([q.x, q.y, q.z, q.w]);
function bodyTensor(body: any, units: number): M {
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
function measure(bodies: any[], units: number) {
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
const initialOrientation = normalize([0.2, 0.3, 0.1, 0.9]);
const offsets: V[] = [
    [0, 0, 0],
    [0.65, 0.15, 0.1],
    [0.2, 0.5, -0.1],
  ],
  masses = [2, 3, 4];
const startCom = scale(
  offsets.reduce(
    (c, p, i) => add(c, scale(rotate(initialOrientation, p), masses[i]!)),
    [0, 0, 0] as V,
  ),
  1 / 9,
);
const omega: V = [2, -3, 4],
  translation: V = [1, -0.2, 0.3];
const rows = [];
for (const units of [1, 100])
  for (const hz of [60, 240])
    for (const substeps of [1, 4])
      for (const reverse of [false, true]) {
        const w = new R.World({ x: 0, y: 0, z: 0 });
        try {
          w.lengthUnit = units;
          w.timestep = 1 / hz;
          w.numSolverIterations = substeps;
          const joints: any[] = [];
          const bodies: any[] = [],
            order = reverse ? [2, 1, 0] : [0, 1, 2];
          for (const i of order) {
            const p = rotate(initialOrientation, offsets[i]!);
            const v = add(
              translation,
              cross(omega, add(p, scale(startCom, -1))),
            );
            const b = w.createRigidBody(
              R.RigidBodyDesc.dynamic()
                .setTranslation(...scale(p, units))
                .setRotation({
                  x: initialOrientation[0],
                  y: initialOrientation[1],
                  z: initialOrientation[2],
                  w: initialOrientation[3],
                })
                .setLinvel(...scale(v, units))
                .setAngvel({ x: omega[0], y: omega[1], z: omega[2] })
                .setCanSleep(false),
            );
            w.createCollider(
              R.ColliderDesc.ball(0.1 * units).setMass(masses[i]!),
              b,
            );
            b.recomputeMassPropertiesFromColliders();
            bodies[i] = b;
          }
          const root = order[0]!,
            identity = { x: 0, y: 0, z: 0, w: 1 };
          for (const i of order.slice(1)) {
            const anchor = scale(
              add(offsets[i]!, scale(offsets[root]!, -1)),
              units,
            );
            const j = w.createMultibodyJoint(
              R.JointData.fixed(
                { x: anchor[0], y: anchor[1], z: anchor[2] },
                identity,
                { x: 0, y: 0, z: 0 },
                identity,
              ),
              bodies[root],
              bodies[i],
              true,
            );
            joints.push(j);
            j.setContactsEnabled(false);
            const damping = w.multibodyJoints.generalizedDamping(j.handle);
            if (
              !w.multibodyJoints.setGeneralizedDamping(
                j.handle,
                damping.fill(0),
              )
            )
              throw Error("Damping write failed");
          }
          // Generalized articulation velocity is not initialized by body descriptors.
          // Bootstrap through explicit loads, then measure the actual load-free state.
          for (const b of bodies) {
            b.setLinvel({ x: 0, y: 0, z: 0 }, true);
            b.setAngvel({ x: 0, y: 0, z: 0 }, true);
            const position = scale(vector(b.worldCom()), 1 / units);
            const desired = add(
              translation,
              cross(omega, add(position, scale(startCom, -1))),
            );
            const force = scale(desired, b.mass() * units * hz);
            const torque = scale(
              mv(bodyTensor(b, units), omega),
              units * units * hz,
            );
            b.addForce({ x: force[0], y: force[1], z: force[2] }, true);
            b.addTorque({ x: torque[0], y: torque[1], z: torque[2] }, true);
          }
          w.step();
          for (const b of bodies) {
            b.resetForces(true);
            b.resetTorques(true);
            if (
              Math.hypot(
                ...vector(b.userForce()),
                ...vector(b.userTorque()),
              ) !== 0
            )
              throw Error("Loads not cleared");
          }
          let checkedStates = 0;
          function verifyFreeMotion() {
            for (const j of joints) {
              const damping = w.multibodyJoints.generalizedDamping(j.handle);
              if (!damping || Array.from(damping).some((value) => value !== 0))
                throw Error("Nonzero generalized damping");
            }
            for (const b of bodies) {
              if (
                Math.hypot(
                  ...vector(b.userForce()),
                  ...vector(b.userTorque()),
                ) !== 0 ||
                b.linearDamping() !== 0 ||
                b.angularDamping() !== 0
              )
                throw Error("Nonzero loads or body damping");
            }
            for (let i = 0; i < bodies.length; i++)
              for (let j = i + 1; j < bodies.length; j++) {
                w.narrowPhase.solverContactPair(
                  bodies[i].collider(0).handle,
                  bodies[j].collider(0).handle,
                  w.bodies,
                  (manifold: any) => {
                    if (manifold.numSolverContacts() !== 0)
                      throw Error("Unexpected solver contacts");
                  },
                );
              }
            checkedStates++;
          }
          verifyFreeMotion();
          const initial = measure(bodies, units),
            inverse = inverseInertia(initial.inertia),
            rootInitial = quat(bodies[root].rotation());
          if (initial.kinetic < 5)
            throw Error("Missing initialized articulation motion");
          const rigidVelocity = scale(initial.linear, 1 / initial.mass);
          const initialRigidResidual = Math.max(
            ...bodies.map((b) =>
              Math.hypot(
                ...add(
                  scale(vector(b.linvel()), 1 / units),
                  scale(
                    add(
                      rigidVelocity,
                      cross(
                        vector(bodies[root].angvel()),
                        add(
                          scale(vector(b.worldCom()), 1 / units),
                          scale(initial.com, -1),
                        ),
                      ),
                    ),
                    -1,
                  ),
                ),
              ),
            ),
          );
          if (initialRigidResidual > 1e-5)
            throw Error("Initial state is not a rigid velocity field");
          const initialAngularResidual = Math.max(
            ...bodies.map((b) =>
              Math.hypot(
                ...add(
                  vector(b.angvel()),
                  scale(vector(bodies[root].angvel()), -1),
                ),
              ),
            ),
          );
          if (initialAngularResidual > 1e-5)
            throw Error("Initial angular velocities disagree");
          const initialSnapshot = w.takeSnapshot();
          const snapshotName = `${units}-${hz}-${substeps}-${reverse ? "reverse" : "forward"}.bin`;
          writeFileSync(
            resolve(snapshotDirectory, snapshotName),
            initialSnapshot,
          );
          const replay = R.World.restoreSnapshot(initialSnapshot);
          let replaySteps = 0;
          let ref: State = {
            rotation: [0, 0, 0, 1],
            momentum: mv(initial.inertia, vector(bodies[root].angvel())),
          };
          const referenceEnergy = energy(ref.momentum, inverse),
            referenceMomentum = [...ref.momentum] as V;
          const maxima = {
            linear: 0,
            angular: 0,
            energy: 0,
            com: 0,
            referenceAngular: 0,
            referenceEnergy: 0,
          };
          let iterations = 0;
          try {
            for (let step = 1; step <= hz; step++) {
              w.step();
              verifyFreeMotion();
              replay.step();
              if (
                !Buffer.from(w.takeSnapshot()).equals(
                  Buffer.from(replay.takeSnapshot()),
                )
              )
                throw Error(`Replay differs at step ${step}`);
              replaySteps++;
              for (let j = 0; j < substeps; j++) {
                const next = midpointStep(ref, inverse, w.timestep / substeps);
                ref = next;
                iterations = Math.max(iterations, next.iterations);
              }
              const measured = measure(bodies, units),
                time = step * w.timestep;
              maxima.linear = Math.max(
                maxima.linear,
                Math.hypot(...add(measured.linear, scale(initial.linear, -1))),
              );
              maxima.angular = Math.max(
                maxima.angular,
                Math.hypot(
                  ...add(measured.angular, scale(initial.angular, -1)),
                ),
              );
              maxima.energy = Math.max(
                maxima.energy,
                Math.abs(measured.kinetic - initial.kinetic),
              );
              maxima.com = Math.max(
                maxima.com,
                Math.hypot(
                  ...add(
                    measured.com,
                    scale(
                      add(
                        initial.com,
                        scale(initial.linear, time / initial.mass),
                      ),
                      -1,
                    ),
                  ),
                ),
              );
              maxima.referenceAngular = Math.max(
                maxima.referenceAngular,
                Math.hypot(
                  ...add(
                    rotate(ref.rotation, ref.momentum),
                    scale(referenceMomentum, -1),
                  ),
                ),
              );
              maxima.referenceEnergy = Math.max(
                maxima.referenceEnergy,
                Math.abs(energy(ref.momentum, inverse) - referenceEnergy),
              );
            }
          } finally {
            replay.free();
          }
          const angle = rotationDistance(
            quat(bodies[root].rotation()),
            multiply(ref.rotation, rootInitial),
          );
          rows.push({
            units,
            hz,
            substeps,
            reverse,
            initial,
            initialRigidResidual,
            initialAngularResidual,
            checkedFreeMotionStates: checkedStates,
            exactReplaySteps: replaySteps,
            initialSnapshot: {
              file: snapshotName,
              sha256: hash(resolve(snapshotDirectory, snapshotName)),
            },
            maxima,
            referenceMaximumNewtonIterations: iterations,
            finalNativeReferenceAngle: angle,
            seconds: hz * w.timestep,
          });
        } finally {
          w.free();
        }
      }
for (const p of sources)
  if (hash(p) !== inputHashes[p])
    throw Error(`Source changed during measurement: ${p}`);
writeFileSync(
  "absolutejs/research/rigid-midpoint/native-comparison.json",
  JSON.stringify(
    {
      scope:
        "Torque-free separated fixed 3-sphere assembly, zero generalized damping, one second. Independent double reference is not installed in the solver and does not qualify contact or hinge integration.",
      engine: R.buildInfo,
      hashes: inputHashes,
      rows,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      cases: rows.length,
      maxNativeLinear: Math.max(...rows.map((r) => r.maxima.linear)),
      maxNativeAngular: Math.max(...rows.map((r) => r.maxima.angular)),
      maxNativeEnergy: Math.max(...rows.map((r) => r.maxima.energy)),
      maxReferenceAngular: Math.max(
        ...rows.map((r) => r.maxima.referenceAngular),
      ),
      maxReferenceEnergy: Math.max(
        ...rows.map((r) => r.maxima.referenceEnergy),
      ),
    },
    null,
    2,
  ),
);
