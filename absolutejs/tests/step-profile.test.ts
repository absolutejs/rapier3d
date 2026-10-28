import { beforeAll, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import R from "@absolutejs/rapier3d";
beforeAll(async () => {
  await R.init();
});
const fixture = readFileSync(
  new URL("./fixtures/profiling-coupled-before.bin", import.meta.url),
);
const world = () => R.World.restoreSnapshot(fixture);
const clock = () => {
  let value = 0;
  return () => (value += 0.25);
};
test("bounded deterministic sampling measures every managed call and labels omitted native samples", () => {
  const w = world();
  try {
    const p = R.createPhysicsStepProfiler(w, {
      sampleStartStep: 1,
      sampleEvery: 3,
      maxSamples: 2,
      now: clock(),
    });
    for (let i = 0; i < 10; i++) {
      p.step();
      expect(w.profilerEnabled).toBe(false);
    }
    const s = p.snapshot();
    expect(s).toMatchObject({
      attemptedSteps: 10,
      completedSteps: 10,
      failedSteps: 0,
      timedSteps: 10,
      totalWallTimeMs: 2.5,
      maxWallTimeMs: 0.25,
      slowestStep: 0,
      timingErrors: 0,
      captureErrors: 0,
      samplesOmittedForBudget: 1,
    });
    expect(s.samples.map((x) => x.step)).toEqual([1, 4]);
    expect(
      s.samples.every(
        (x) => x.captureStatus === "captured" && x.native !== null,
      ),
    ).toBe(true);
  } finally {
    w.free();
  }
});
test("sampling preserves exact native motion and borrowed profiler settings", () => {
  for (const enabled of [false, true]) {
    const a = world(),
      b = R.World.restoreSnapshot(a.takeSnapshot());
    a.profilerEnabled = enabled;
    try {
      const p = R.createPhysicsStepProfiler(a, {
        sampleEvery: 3,
        maxSamples: 4,
        now: clock(),
      });
      for (let i = 0; i < 30; i++) {
        p.step();
        b.step();
        expect(a.takeSnapshot()).toEqual(b.takeSnapshot());
        expect(a.profilerEnabled).toBe(enabled);
        if (enabled) expect(a.contactConvergence()).not.toBeNull();
      }
      expect(p.snapshot().samples).toHaveLength(4);
    } finally {
      a.free();
      b.free();
    }
  }
});
test("captured native data and reports are owned and remain readable after the world is freed", () => {
  const w = world();
  const p = R.createPhysicsStepProfiler(w, {
    sampleEvery: 1,
    maxSamples: 1,
    now: clock(),
  });
  p.step();
  const before = w.takeSnapshot(),
    s = p.snapshot();
  expect(s.samples[0]!.native!.convergence.compressionSolves).toBeGreaterThan(
    0,
  );
  const original = p.snapshot();
  s.samples[0]!.native!.convergence.compressionIterations = -1;
  s.samples[0]!.native!.timings.solverMs = -1;
  s.samples.length = 0;
  expect(p.snapshot()).toEqual(original);
  expect(w.takeSnapshot()).toEqual(before);
  w.free();
  expect(p.snapshot()).toEqual(original);
});
test("World.step failures retain their exact thrown value and restore profiling", () => {
  const w = world();
  try {
    const p = R.createPhysicsStepProfiler(w, {
      sampleEvery: 1,
      maxSamples: 2,
      now: clock(),
    });
    const before = w.takeSnapshot();
    for (const error of [new Error("native failure sentinel"), undefined]) {
      w.step = () => {
        throw error;
      };
      let threw = false;
      try {
        p.step();
      } catch (actual) {
        threw = true;
        expect(actual).toBe(error);
      }
      expect(threw).toBe(true);
      expect(w.profilerEnabled).toBe(false);
    }
    const s = p.snapshot();
    expect(s).toMatchObject({
      attemptedSteps: 2,
      completedSteps: 0,
      failedSteps: 2,
      timedSteps: 2,
      captureErrors: 0,
    });
    expect(
      s.samples.every(
        (x) =>
          x.outcome === "threw" &&
          x.captureStatus === "step-threw" &&
          x.native === null,
      ),
    ).toBe(true);
    expect(w.takeSnapshot()).toEqual(before);
  } finally {
    w.free();
  }
});
test("bad clocks do not stop physics and never become invented zero timings", () => {
  const w = world();
  try {
    const values: [
      number,
      number,
      number,
      number,
      () => never,
      number,
      number,
      number,
    ] = [
      10,
      9,
      NaN,
      20,
      () => {
        throw Error("clock");
      },
      30,
      0,
      1,
    ];
    let index = 0;
    const p = R.createPhysicsStepProfiler(w, {
      maxSamples: 0,
      now: () => {
        const x = values[index++]!;
        return typeof x === "function" ? x() : x;
      },
    });
    for (let i = 0; i < 4; i++) p.step();
    expect(p.snapshot()).toMatchObject({
      attemptedSteps: 4,
      completedSteps: 4,
      failedSteps: 0,
      timedSteps: 1,
      timingErrors: 3,
      totalWallTimeMs: 1,
      maxWallTimeMs: 1,
      slowestStep: 3,
      samples: [],
    });
  } finally {
    w.free();
  }
});
test("finite duration sum overflow is explicit instead of serializing Infinity as a false measurement", () => {
  const w = world();
  try {
    let i = 0;
    const p = R.createPhysicsStepProfiler(w, {
      maxSamples: 0,
      now: () => (i++ % 2 === 0 ? -Number.MAX_VALUE : 0),
    });
    p.step();
    p.step();
    expect(p.snapshot()).toMatchObject({
      timedSteps: 2,
      totalWallTimeMs: null,
      timingErrors: 1,
      maxWallTimeMs: Number.MAX_VALUE,
    });
  } finally {
    w.free();
  }
});
test("native capture failure cannot change the successful physical step or escape as its failure", () => {
  const w = world(),
    control = R.World.restoreSnapshot(w.takeSnapshot());
  try {
    w.contactConvergence = () => {
      throw Error("capture");
    };
    const p = R.createPhysicsStepProfiler(w, { maxSamples: 1, now: clock() });
    p.step();
    control.step();
    expect(w.takeSnapshot()).toEqual(control.takeSnapshot());
    expect(w.profilerEnabled).toBe(false);
    expect(p.snapshot()).toMatchObject({
      completedSteps: 1,
      failedSteps: 0,
      captureErrors: 1,
      samples: [{ captureStatus: "capture-failed", native: null }],
    });
  } finally {
    control.free();
    w.free();
  }
});
test("profiler setup/restore errors are counted while the underlying step still runs", () => {
  const w = world(),
    control = R.World.restoreSnapshot(w.takeSnapshot());
  try {
    Object.defineProperty(w, "profilerEnabled", {
      get: () => false,
      set: () => {
        throw Error("profiler unavailable");
      },
    });
    const p = R.createPhysicsStepProfiler(w, { maxSamples: 1, now: clock() });
    p.step();
    control.step();
    expect(w.takeSnapshot()).toEqual(control.takeSnapshot());
    expect(p.snapshot()).toMatchObject({
      completedSteps: 1,
      failedSteps: 0,
      captureErrors: 2,
    });
  } finally {
    control.free();
    w.free();
  }
});
test("sampling configuration is bounded and rejected before mutating the world", () => {
  const w = world();
  try {
    const before = w.takeSnapshot();
    for (const options of [
      { sampleEvery: 0 },
      { sampleEvery: 1.5 },
      { sampleEvery: Infinity },
      { sampleEvery: 1000001 },
      { sampleStartStep: -1 },
      { sampleStartStep: 1000000001 },
      { maxSamples: -1 },
      { maxSamples: 257 },
      { maxSamples: NaN },
      { now: null },
    ])
      expect(() => R.createPhysicsStepProfiler(w, options as never)).toThrow();
    expect(w.takeSnapshot()).toEqual(before);
    expect(w.profilerEnabled).toBe(false);
  } finally {
    w.free();
  }
});
test("zero sample budget retains no native buffers and steps continue past the cap", () => {
  const w = new R.World({ x: 0, y: 0, z: 0 });
  try {
    const p = R.createPhysicsStepProfiler(w, {
      sampleEvery: 1,
      maxSamples: 0,
      now: clock(),
    });
    for (let i = 0; i < 2000; i++) p.step();
    expect(p.snapshot()).toMatchObject({
      attemptedSteps: 2000,
      completedSteps: 2000,
      samplesOmittedForBudget: 2000,
      samples: [],
    });
    expect(w.profilerEnabled).toBe(false);
  } finally {
    w.free();
  }
});
test("event queue and hook arguments are forwarded without taking ownership", () => {
  const w = world(),
    queue = new R.EventQueue(true);
  try {
    const original = w.step;
    const hooks = {} as R.PhysicsHooks;
    let seen: unknown[] = [];
    w.step = function (events, passedHooks) {
      seen = [events, passedHooks];
      return original.call(this, events, passedHooks);
    };
    R.createPhysicsStepProfiler(w, { maxSamples: 0, now: clock() }).step(
      queue,
      hooks,
    );
    expect(seen[0]).toBe(queue);
    expect(seen[1]).toBe(hooks);
    queue.drainCollisionEvents(() => {});
  } finally {
    queue.free();
    w.free();
  }
});
