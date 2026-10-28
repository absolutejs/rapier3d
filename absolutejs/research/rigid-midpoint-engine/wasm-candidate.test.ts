import { beforeAll, expect, test } from "bun:test";
import R from "../../../dist/rapier.mjs";
beforeAll(async () => { await R.init(); });
const zero = {x:0,y:0,z:0};
const identity = {x:0,y:0,z:0,w:1};
function world(inertia = {x:2,y:3,z:4}) {
  const w = new R.World(zero);
  w.timestep = 1/240;
  w.numSolverIterations = 4;
  w.integrationParameters.maxCcdSubsteps = 0;
  const body = w.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(false)
    .setAdditionalMassProperties(1, zero, inertia, identity));
  w.step();
  body.setAngvel({x:2,y:-3,z:4},true);
  return {w,body};
}
test("private native observations have owned storage and profiled-step freshness", () => {
  const {w} = world();
  try {
    const raw = w.physicsPipeline.raw;
    expect(raw.free_rotation_candidate()).toBeUndefined();
    w.profilerEnabled = true;
    expect(raw.free_rotation_candidate()).toBeUndefined();
    w.step();
    const observation = raw.free_rotation_candidate()!;
    expect(Array.from(observation.slice(0,4))).toEqual([4,0,0,0]);
    expect(observation[4]).toBeLessThanOrEqual(4);
    expect(observation[5]).toBeLessThan(1e-10);
    observation[0] = -123;
    expect(raw.free_rotation_candidate()![0]).toBe(4);
    const restored = R.World.restoreSnapshot(w.takeSnapshot());
    try { expect(restored.physicsPipeline.raw.free_rotation_candidate()).toBeUndefined(); }
    finally {restored.free();}
    w.profilerEnabled = false;
    expect(raw.free_rotation_candidate()).toBeUndefined();
    w.step();
    expect(raw.free_rotation_candidate()).toBeUndefined();
  } finally {w.free();}
});
test("private nonphysical inertia rejection is explicit and retained across substeps", () => {
  const {w} = world({x:1,y:1.0001,z:0.000001});
  try {
    w.profilerEnabled = true;
    for(let i=0;i<10;i++) {
      w.step();
      expect(Array.from(w.physicsPipeline.raw.free_rotation_candidate()!.slice(0,4))).toEqual([0,1,0,0]);
    }
  } finally {w.free();}
});
test("native observations do not alter snapshot bytes through changing eligibility", () => {
  const {w:a,body} = world();
  const b = R.World.restoreSnapshot(a.takeSnapshot());
  try {
    a.profilerEnabled = true;
    for(let i=0;i<120;i++) {
      const damping=i%3===0?0.1:0;
      body.setAngularDamping(damping);
      b.getRigidBody(body.handle).setAngularDamping(damping);
      a.step(); b.step();
      expect(a.takeSnapshot()).toEqual(b.takeSnapshot());
      expect(a.physicsPipeline.raw.free_rotation_candidate()![0]).toBe(damping===0?4:0);
    }
  } finally {a.free();b.free();}
});
