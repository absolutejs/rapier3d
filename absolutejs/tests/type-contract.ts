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
