import R from '@absolutejs/rapier3d';
export function wakeFixture(kind: 'impulse' | 'multibody', count: number, engine = R) {
  const world = new engine.World({ x: 0, y: 0, z: 0 });
  const bodies: R.RigidBody[] = [];
  const joints: (R.ImpulseJoint | R.MultibodyJoint)[] = [];
  const q = { x: 0, y: 0, z: 0, w: 1 };
  for (let i = 0; i < count; i++) {
    const pair = [0, 1].map(j => world.createRigidBody(engine.RigidBodyDesc.dynamic().setTranslation(i * 4 + j, 0, 0)
      .setAdditionalMassProperties(1, { x: 0, y: 0, z: 0 }, { x: .2, y: .2, z: .2 }, q)));
    bodies.push(...pair);
    const data = engine.JointData.fixed({ x: 1, y: 0, z: 0 }, q, { x: 0, y: 0, z: 0 }, q);
    joints.push(kind === 'impulse' ? world.createImpulseJoint(data, pair[0]!, pair[1]!, true)
      : world.createMultibodyJoint(data, pair[0]!, pair[1]!, true));
  }
  return { world, bodies, releaseSleeping() {
    for (let i = 0; i < 180; i++) world.step();
    if (!bodies.every(b => b.isSleeping())) throw Error('Wake fixture did not sleep');
    for (const joint of joints) {
      if (kind === 'impulse') world.removeImpulseJoint(joint as R.ImpulseJoint, true);
      else world.removeMultibodyJoint(joint as R.MultibodyJoint, true);
    }
    bodies.forEach((body, i) => body.setLinvel({ x: i * .001, y: -.2, z: .1 }, false));
  } };
}
export const equalSnapshot = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((value, i) => value === b[i]);
