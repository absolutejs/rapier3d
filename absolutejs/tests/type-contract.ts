import R, { type SolverContactManifold, type Collider } from '../../dist/types/rapier';
declare const world: R.World;
declare const first: Collider;
declare const second: Collider;
world.solverContactPair(first, second, (m: SolverContactManifold, flipped: boolean) => {
 const p: R.Vector | null = m.solverContactPoint(0);
 const distance: number = m.solverContactDist(0);
 const live: number | null = m.solverContactSeparation(0);
 const first: R.Vector | null = m.solverContactPoint1(0);
 const second: R.Vector | null = m.solverContactPoint2(0);
 void [live,first,second];
 // @ts-expect-error Clusters do not preserve original subshape identifiers.
 m.subshape1();
 void [p, distance, flipped];
});

const ccdSubsteps: number | null = world.ccdSubsteps();
void ccdSubsteps;

const recycling: boolean = world.integrationParameters.contactRecycling;
const recycleDistance: number = world.integrationParameters.normalizedContactRecycleDistance;
const warmstart: number = world.integrationParameters.warmstartCoefficient;
world.integrationParameters.contactRecycling = false;
world.integrationParameters.normalizedContactRecycleDistance = 0.001;
world.integrationParameters.warmstartCoefficient = 0.5;
// @ts-expect-error Contact recycling is a boolean policy, not a number.
world.integrationParameters.contactRecycling = 1;
// @ts-expect-error Solver coefficients are numeric.
world.integrationParameters.warmstartCoefficient = '0.5';
void [recycling, recycleDistance, warmstart];

const fresh: R.ShapeContact | null = first.contactColliderAtCurrentBodyPoses(second, 0.01);
first.contactColliderAtCurrentBodyPoses(second);
if (fresh) first.contactColliderAtCurrentBodyPoses(second, 0, fresh);
// @ts-expect-error Prediction is numeric.
first.contactColliderAtCurrentBodyPoses(second, '0.01');

import {buildInfo, type PhysicsBuildInfo} from '@absolutejs/rapier3d/build-info';
const identity: PhysicsBuildInfo = buildInfo;
const hash: string = identity.wasmSha256;
// @ts-expect-error Artifact identity is read-only.
identity.packageVersion = 'spoof';
void hash;
const collisionVersion: string = identity.collisionLibraryVersion;
const collisionSource: string = identity.collisionSource;
// @ts-expect-error Collision provenance is immutable too.
identity.collisionSource = 'unverified';
void [collisionVersion, collisionSource];

// Explicit articulation-wide damping: copied native values and transactional writes.
function articulationDampingContract(set: import("@absolutejs/rapier3d").MultibodyJointSet, handle:number) {
 const values:Float32Array|undefined=set.generalizedDamping(handle);
 const changed:boolean=set.setGeneralizedDamping(handle,values ?? []);
 return changed;
}

const convergence: R.ContactConvergenceStats | null = world.contactConvergence();
if (convergence) {
 const iterations: number = convergence.compressionIterations;
 const residual: number = convergence.maxRestitutionResidual;
 void [iterations,residual];
}

const recorder = R.createPhysicsStepProfiler(world, {sampleEvery: 32, maxSamples: 16});
recorder.step();
const profile: R.PhysicsStepProfile = recorder.snapshot();
const sample: R.PhysicsStepSample | undefined = profile.samples[0];
const options: R.PhysicsStepProfileOptions = {sampleStartStep: 8};
// @ts-expect-error Cadence must be numeric.
R.createPhysicsStepProfiler(world, {sampleEvery: '32'});
void [sample, options];

const rotationStats: R.FreeRotationStats | null = world.freeRotationStats();
if (rotationStats) {
 const accepted: number = rotationStats.acceptedSteps;
 const residual: number = rotationStats.maxResidualRadiansPerSecond;
 void [accepted, residual];
}
if (sample?.native) {
 const capturedRotation: R.FreeRotationStats = sample.native.freeRotation;
 void capturedRotation;
}

const assemblyStats: R.FreeAssemblyStats | null = world.freeAssemblyStats();
if (assemblyStats) { const accepted: number = assemblyStats.acceptedSteps; void accepted; }
if (sample?.native) { const capturedAssembly: R.FreeAssemblyStats = sample.native.freeAssembly; void capturedAssembly; }
