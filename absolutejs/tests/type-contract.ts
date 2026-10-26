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
