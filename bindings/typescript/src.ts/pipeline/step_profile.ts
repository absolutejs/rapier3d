import type {World, ContactConvergenceStats, FreeRotationStats, FreeAssemblyStats} from "./world";
import type {EventQueue} from "./event_queue";
import type {PhysicsHooks} from "./physics_hooks";

export interface PhysicsStepSample {
    /** Zero-based index among calls made through this recorder. */
    step: number;
    outcome: "completed" | "threw";
    /** Time inside World.step, excluding profile capture and recorder bookkeeping. */
    wallTimeMs: number | null;
    captureStatus: "captured" | "step-threw" | "capture-failed";
    native: {
        lengthUnit: number;
        timestep: number;
        solverIterations: number;
        ccdSubsteps: number;
        timings: {
            stepMs: number;
            collisionDetectionMs: number;
            solverMs: number;
            assemblyMs: number;
            resolutionMs: number;
            ccdMs: number;
        };
        convergence: ContactConvergenceStats;
        freeRotation: FreeRotationStats;
        freeAssembly: FreeAssemblyStats;
    } | null;
}

export interface PhysicsStepProfile {
    sampleEvery: number;
    sampleStartStep: number;
    maxSamples: number;
    attemptedSteps: number;
    completedSteps: number;
    failedSteps: number;
    timedSteps: number;
    /** Null if a finite sum could not be represented. */
    totalWallTimeMs: number | null;
    maxWallTimeMs: number | null;
    slowestStep: number | null;
    timingErrors: number;
    captureErrors: number;
    samplesOmittedForBudget: number;
    /** Owned bounded samples. They do not estimate all unsampled native phases. */
    samples: PhysicsStepSample[];
}

export interface PhysicsStepProfileOptions {
    /** Capture every Nth managed call, default 32; integer 1..1,000,000. */
    sampleEvery?: number;
    /** First managed call eligible for capture, default 0; integer 0..1,000,000,000. */
    sampleStartStep?: number;
    /** Maximum retained/captured native profiles, default 32; integer 0..256. */
    maxSamples?: number;
    /** Monotonic milliseconds; defaults to performance.now. Failures are recorded. */
    now?: () => number;
}

/** Borrow a world for explicitly managed steps. No listeners, render loop, timer,
 * transport, or world ownership is created. Each sampled call restores the
 * previous profiler setting, including on an exception. Unselected calls leave
 * the setting alone. World.step exceptions propagate unchanged after accounting.
 * Attach the actual engine/build identity when exporting a snapshot.
 */
export function createPhysicsStepProfiler(
    world: World,
    options: PhysicsStepProfileOptions = {},
) {
    const sampleEvery = options.sampleEvery ?? 32;
    const sampleStartStep = options.sampleStartStep ?? 0;
    const maxSamples = options.maxSamples ?? 32;
    for (const [name, value, minimum, maximum] of [
        ["sampleEvery", sampleEvery, 1, 1_000_000],
        ["sampleStartStep", sampleStartStep, 0, 1_000_000_000],
        ["maxSamples", maxSamples, 0, 256],
    ] as const) {
        if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
            throw new RangeError(
                `${name} must be an integer from ${minimum} to ${maximum}`,
            );
    }
    if (options.now !== undefined && typeof options.now !== "function")
        throw new TypeError("now must be a function");
    const now = options.now ?? (() => performance.now());
    const samples: PhysicsStepSample[] = [];
    let attemptedSteps = 0,
        completedSteps = 0,
        failedSteps = 0,
        timedSteps = 0;
    let totalWallTimeMs: number | null = 0,
        maxWallTimeMs: number | null = null;
    let slowestStep: number | null = null,
        timingErrors = 0,
        captureErrors = 0,
        samplesOmittedForBudget = 0;
    const clock = (): number | null => {
        try {
            const value = now();
            return Number.isFinite(value) ? value : null;
        } catch {
            return null;
        }
    };
    const capture = (): NonNullable<PhysicsStepSample["native"]> => {
        const ccdSubsteps = world.ccdSubsteps(),
            convergence = world.contactConvergence(),
            freeRotation = world.freeRotationStats(),
            freeAssembly = world.freeAssemblyStats();
        if (ccdSubsteps === null || convergence === null || freeRotation === null || freeAssembly === null)
            throw new Error("No completed profiled step");
        const timings = {
            stepMs: world.timingStep(),
            collisionDetectionMs: world.timingCollisionDetection(),
            solverMs: world.timingSolver(),
            assemblyMs: world.timingVelocityAssembly(),
            resolutionMs: world.timingVelocityResolution(),
            ccdMs: world.timingCcd(),
        };
        if (
            Object.values(timings).some(
                (value) => !Number.isFinite(value) || value < 0,
            ) ||
            Object.values(freeAssembly).some(
                (value) => !Number.isFinite(value) || value < 0,
            ) ||
            Object.values(freeRotation).some(
                (value) => !Number.isFinite(value) || value < 0,
            ) ||
            Object.values(convergence).some(
                (value) => !Number.isFinite(value) || value < 0,
            )
        )
            throw new Error("Invalid native profiling observations");
        return {
            lengthUnit: world.lengthUnit,
            timestep: world.timestep,
            solverIterations: world.numSolverIterations,
            ccdSubsteps,
            timings,
            convergence,
            freeRotation,
            freeAssembly,
        };
    };
    return {
        step(eventQueue?: EventQueue, hooks?: PhysicsHooks): void {
            const step = attemptedSteps++;
            const eligible =
                step >= sampleStartStep &&
                (step - sampleStartStep) % sampleEvery === 0;
            const selected = eligible && samples.length < maxSamples;
            if (eligible && !selected) samplesOmittedForBudget++;
            let previous: boolean | undefined,
                restore = false,
                canCapture = false;
            if (selected) {
                try {
                    previous = world.profilerEnabled;
                    restore = true;
                    if (!previous) {
                        world.profilerEnabled = true;
                    }
                    canCapture = true;
                } catch {
                    captureErrors++;
                }
            }
            const start = clock();
            let failed = false,
                failure: unknown;
            try {
                world.step(eventQueue, hooks);
                completedSteps++;
            } catch (error) {
                failed = true;
                failure = error;
                failedSteps++;
            }
            const end = clock();
            let wallTimeMs: number | null = null;
            if (
                start !== null &&
                end !== null &&
                Number.isFinite(end - start) &&
                end >= start
            ) {
                wallTimeMs = end - start;
                timedSteps++;
                if (totalWallTimeMs !== null) {
                    const sum = totalWallTimeMs + wallTimeMs;
                    if (Number.isFinite(sum)) totalWallTimeMs = sum;
                    else {
                        totalWallTimeMs = null;
                        timingErrors++;
                    }
                }
                if (maxWallTimeMs === null || wallTimeMs > maxWallTimeMs) {
                    maxWallTimeMs = wallTimeMs;
                    slowestStep = step;
                }
            } else timingErrors++;
            if (selected) {
                let native: PhysicsStepSample["native"] = null;
                if (!failed && canCapture) {
                    try {
                        native = capture();
                    } catch {
                        captureErrors++;
                    }
                }
                if (restore && previous !== undefined) {
                    try {
                        world.profilerEnabled = previous;
                    } catch {
                        captureErrors++;
                    }
                }
                samples.push({
                    step,
                    outcome: failed ? "threw" : "completed",
                    wallTimeMs,
                    captureStatus: failed
                        ? "step-threw"
                        : native
                          ? "captured"
                          : "capture-failed",
                    native,
                });
            }
            if (failed) throw failure;
        },
        /** Deep-owned report; no live native query is performed here. */
        snapshot(): PhysicsStepProfile {
            return {
                sampleEvery,
                sampleStartStep,
                maxSamples,
                attemptedSteps,
                completedSteps,
                failedSteps,
                timedSteps,
                totalWallTimeMs,
                maxWallTimeMs,
                slowestStep,
                timingErrors,
                captureErrors,
                samplesOmittedForBudget,
                samples: samples.map((sample) => ({
                    ...sample,
                    native: sample.native
                        ? {
                              ...sample.native,
                              timings: {...sample.native.timings},
                              convergence: {...sample.native.convergence},
                              freeRotation: {...sample.native.freeRotation},
                              freeAssembly: {...sample.native.freeAssembly},
                          }
                        : null,
                })),
            };
        },
    };
}
