import { test, expect } from "bun:test";
import {
  midpointStep,
  inverseInertia,
  mv,
  energy,
  rotate,
  rotationDistance,
  normalize,
  type M,
  type State,
} from "./reference";
const inertia: M = [2, 0.3, 0.1, 0.3, 3, 0.2, 0.1, 0.2, 4];
const inverse = inverseInertia(inertia);
test("matched midpoint and Cayley updates conserve energy and WORLD angular momentum in nonprincipal free spin", () => {
  let state: State = {
    rotation: normalize([0.2, 0.3, 0.1, 0.9]),
    momentum: mv(inertia, [2, -3, 4]),
  };
  const initialEnergy = energy(state.momentum, inverse),
    initialMomentum = rotate(state.rotation, state.momentum);
  let maxEnergy = 0,
    maxMomentum = 0,
    maxIterations = 0;
  for (let i = 0; i < 2400; i++) {
    const next = midpointStep(state, inverse, 1 / 240);
    state = next;
    maxIterations = Math.max(maxIterations, next.iterations);
    maxEnergy = Math.max(
      maxEnergy,
      Math.abs(energy(state.momentum, inverse) - initialEnergy),
    );
    const current = rotate(state.rotation, state.momentum);
    maxMomentum = Math.max(
      maxMomentum,
      Math.hypot(...current.map((v, i) => v - initialMomentum[i]!)),
    );
  }
  expect(maxEnergy).toBeLessThan(1e-9);
  expect(maxMomentum).toBeLessThan(1e-9);
  expect(maxIterations).toBeLessThanOrEqual(4);
});
test("reference is time reversible and owns all returned state", () => {
  const initial: State = {
    rotation: normalize([0.2, 0.3, 0.1, 0.9]),
    momentum: mv(inertia, [2, -3, 4]),
  };
  let state = structuredClone(initial);
  for (let i = 0; i < 120; i++) state = midpointStep(state, inverse, 1 / 120);
  for (let i = 0; i < 120; i++) state = midpointStep(state, inverse, -1 / 120);
  expect(rotationDistance(state.rotation, initial.rotation)).toBeLessThan(
    1e-10,
  );
  expect(
    Math.hypot(...state.momentum.map((v, i) => v - initial.momentum[i]!)),
  ).toBeLessThan(1e-10);
  const copy = structuredClone(initial);
  midpointStep(initial, inverse, 1 / 60);
  expect(initial).toEqual(copy);
});
test("principal spin uses the known Cayley angle and zero spin is unchanged", () => {
  const inv = inverseInertia([2, 0, 0, 0, 3, 0, 0, 0, 4]);
  const next = midpointStep(
    { rotation: [0, 0, 0, 1], momentum: [4, 0, 0] },
    inv,
    0.1,
  );
  expect(
    rotationDistance(next.rotation, [
      Math.sin(Math.atan(0.1)),
      0,
      0,
      Math.cos(Math.atan(0.1)),
    ]),
  ).toBeLessThan(1e-14);
  expect(next.momentum).toEqual([4, 0, 0]);
  expect(
    midpointStep({ rotation: [0, 0, 0, 1], momentum: [0, 0, 0] }, inv, 0.1)
      .rotation,
  ).toEqual([0, 0, 0, 1]);
});
test("singular/asymmetric inertia and exhausted nonlinear solves fail explicitly", () => {
  for (const matrix of [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 2, 0, 0, 1, 0, 0, 0, 1],
    [-1, 0, 0, 0, 1, 0, 0, 0, 1],
  ])
    expect(() => inverseInertia(matrix as M)).toThrow();
  expect(() =>
    midpointStep(
      { rotation: [0, 0, 0, 1], momentum: mv(inertia, [20, -30, 40]) },
      inverse,
      1,
      1,
    ),
  ).toThrow("budget");
});

test("conserved trajectories also converge at second order toward an independent refined RK4 solution", async () => {
  const { rk4Step } = await import("./rk4");
  const initial: State = {
    rotation: normalize([0.2, 0.3, 0.1, 0.9]),
    momentum: mv(inertia, [2, -3, 4]),
  };
  let reference = structuredClone(initial),
    finer = structuredClone(initial);
  for (let i = 0; i < 3840; i++)
    reference = rk4Step(reference, inverse, 1 / 3840);
  for (let i = 0; i < 7680; i++) finer = rk4Step(finer, inverse, 1 / 7680);
  expect(rotationDistance(reference.rotation, finer.rotation)).toBeLessThan(
    1e-10,
  );
  const errors = [];
  for (const hz of [60, 120, 240]) {
    let state = structuredClone(initial);
    for (let i = 0; i < hz; i++) state = midpointStep(state, inverse, 1 / hz);
    errors.push(rotationDistance(state.rotation, finer.rotation));
  }
  expect(errors[0]! / errors[1]!).toBeGreaterThan(3.9);
  expect(errors[0]! / errors[1]!).toBeLessThan(4.1);
  expect(errors[1]! / errors[2]!).toBeGreaterThan(3.9);
  expect(errors[1]! / errors[2]!).toBeLessThan(4.1);
});
