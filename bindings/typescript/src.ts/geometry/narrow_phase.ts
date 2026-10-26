import {RawNarrowPhase, RawContactManifold} from "../raw";
import {ColliderHandle} from "./collider";
import {RigidBodySet} from "../dynamics";
import {Vector, VectorOps, scratchBuffer} from "../math";

/**
 * The narrow-phase used for precise collision-detection.
 *
 * To avoid leaking WASM resources, this MUST be freed manually with `narrowPhase.free()`
 * once you are done using it.
 */
export class NarrowPhase {
    raw: RawNarrowPhase;
    tempManifold: TempContactManifold;

    /**
     * Release the WASM memory occupied by this narrow-phase.
     */
    public free() {
        if (!!this.raw) {
            this.raw.free();
        }
        this.raw = undefined;
    }

    constructor(raw?: RawNarrowPhase) {
        this.raw = raw || new RawNarrowPhase();
        this.tempManifold = new TempContactManifold(null);
    }

    /**
     * Enumerates all the colliders potentially in contact with the given collider.
     *
     * @param collider1 - The second collider involved in the contact.
     * @param f - Closure that will be called on each collider that is in contact with `collider1`.
     */
    public contactPairsWith(
        collider1: ColliderHandle,
        f: (collider2: ColliderHandle) => void,
    ) {
        this.raw.contact_pairs_with(collider1, f);
    }

    /**
     * Enumerates all the colliders intersecting the given colliders, assuming one of them
     * is a sensor.
     */
    public intersectionPairsWith(
        collider1: ColliderHandle,
        f: (collider2: ColliderHandle) => void,
    ) {
        this.raw.intersection_pairs_with(collider1, f);
    }

    /**
     * Iterates through all the contact manifolds between the given pair of colliders.
     *
     * @param collider1 - The first collider involved in the contact.
     * @param collider2 - The second collider involved in the contact.
     * @param bodies - The set of rigid-bodies the colliders are attached to. Solver contacts are
     *                 anchored in body-local space, so this is needed to read them back in world-space.
     * @param f - Closure that will be called on each contact manifold between the two colliders. If the second argument
     *            passed to this closure is `true`, then the contact manifold data is flipped, i.e., methods like `localNormal1`
     *            actually apply to the `collider2` and fields like `localNormal2` apply to the `collider1`.
     */
    public contactPair(
        collider1: ColliderHandle,
        collider2: ColliderHandle,
        bodies: RigidBodySet,
        f: (manifold: TempContactManifold, flipped: boolean) => void,
    ) {
        const rawPair = this.raw.contact_pair(collider1, collider2);

        if (!!rawPair) {
            const flipped = rawPair.collider1() != collider1;

            let i;
            for (i = 0; i < rawPair.numContactManifolds(); ++i) {
                this.tempManifold.bodies = bodies;
                this.tempManifold.raw = rawPair.contactManifold(i);
                if (!!this.tempManifold.raw) {
                    f(this.tempManifold, flipped);
                }

                // SAFETY: The RawContactManifold stores a raw pointer that will be invalidated
                //         at the next timestep. So we must be sure to free the pair here
                //         to avoid unsoundness in the Rust code.
                this.tempManifold.free();
            }
            rawPair.free();
        }
    }

    /**
     * Visits the manifolds consumed by the solver, including clustered contacts.
     * Original geometric manifolds remain available through contactPair().
     * The view is valid only during the callback. Do not step, free, or mutate
     * the world in the callback. Copy values that must survive the call.
     * Clustered contacts do not preserve geometric subshape identifiers.
     */
    public solverContactPair(
        collider1: ColliderHandle,
        collider2: ColliderHandle,
        bodies: RigidBodySet,
        f: (manifold: SolverContactManifold, flipped: boolean) => void,
    ) {
        const pair = this.raw.contact_pair(collider1, collider2);
        if (!pair) return;
        try {
            const flipped = pair.collider1() != collider1;
            for (let i = 0; i < pair.numSolverManifolds(); i++) {
                const raw = pair.solverManifold(i);
                if (!raw) continue;
                const view = new TempContactManifold(raw);
                view.bodies = bodies;
                try { f(view, flipped); }
                finally { view.free(); }
            }
        } finally { pair.free(); }
    }

    /**
     * Returns `true` if `collider1` and `collider2` intersect and at least one of them is a sensor.
     * @param collider1 − The first collider involved in the intersection.
     * @param collider2 − The second collider involved in the intersection.
     */
    public intersectionPair(
        collider1: ColliderHandle,
        collider2: ColliderHandle,
    ): boolean {
        return this.raw.intersection_pair(collider1, collider2);
    }
}

export class TempContactManifold {
    raw: RawContactManifold;
    /** The bodies the manifold's solver contacts are anchored to. */
    bodies: RigidBodySet;

    public free() {
        if (!!this.raw) {
            this.raw.free();
        }
        this.raw = undefined;
    }

    constructor(raw: RawContactManifold, bodies?: RigidBodySet) {
        this.raw = raw;
        this.bodies = bodies;
    }

    /**
     * The contact normal of the manifold, expressed in world-space.
     *
     * @param {Vector?} target - The object to be populated. If provided,
     * the function returns this object instead of creating a new one.
     */
    public normal(target?: Vector): Vector {
        this.raw.normal(scratchBuffer);
        return VectorOps.fromBuffer(scratchBuffer, target);
    }

    /**
     * The contact normal of the manifold, expressed in the local-space of the first shape.
     *
     * @param {Vector?} target - The object to be populated. If provided,
     * the function returns this object instead of creating a new one.
     */
    public localNormal1(target?: Vector): Vector {
        this.raw.local_n1(scratchBuffer);
        return VectorOps.fromBuffer(scratchBuffer, target);
    }

    /**
     * The contact normal of the manifold, expressed in the local-space of the second shape.
     *
     * @param {Vector?} target - The object to be populated. If provided,
     * the function returns this object instead of creating a new one.
     */
    public localNormal2(target?: Vector): Vector {
        this.raw.local_n2(scratchBuffer);
        return VectorOps.fromBuffer(scratchBuffer, target);
    }

    public subshape1(): number {
        return this.raw.subshape1();
    }

    public subshape2(): number {
        return this.raw.subshape2();
    }

    public numContacts(): number {
        return this.raw.num_contacts();
    }

    /**
     * The local-space contact point on the first shape, for the `i`-th contact.
     *
     * @param {number} i - The index of the contact to read.
     * @param {Vector?} target - The object to be populated. If provided,
     * the function returns this object instead of creating a new one.
     */
    public localContactPoint1(i: number, target?: Vector): Vector | null {
        const exists = this.raw.contact_local_p1(i, scratchBuffer);
        return exists ? VectorOps.fromBuffer(scratchBuffer, target) : null;
    }

    /**
     * The local-space contact point on the second shape, for the `i`-th contact.
     *
     * @param {number} i - The index of the contact to read.
     * @param {Vector?} target - The object to be populated. If provided,
     * the function returns this object instead of creating a new one.
     */
    public localContactPoint2(i: number, target?: Vector): Vector | null {
        const exists = this.raw.contact_local_p2(i, scratchBuffer);
        return exists ? VectorOps.fromBuffer(scratchBuffer, target) : null;
    }

    public contactDist(i: number): number {
        return this.raw.contact_dist(i);
    }

    public contactFid1(i: number): number {
        return this.raw.contact_fid1(i);
    }

    public contactFid2(i: number): number {
        return this.raw.contact_fid2(i);
    }

    public contactImpulse(i: number): number {
        return this.raw.contact_impulse(i);
    }

    // #if DIM2
    public contactTangentImpulse(i: number): number {
        return this.raw.contact_tangent_impulse(i);
    }
    // #endif

    // #if DIM3
    public contactTangentImpulseX(i: number): number {
        return this.raw.contact_tangent_impulse_x(i);
    }

    public contactTangentImpulseY(i: number): number {
        return this.raw.contact_tangent_impulse_y(i);
    }
    // #endif

    public numSolverContacts(): number {
        return this.raw.num_solver_contacts();
    }

    /**
     * The world-space position of the `i`-th solver contact point.
     *
     * @param {number} i - The index of the solver contact to read.
     * @param {Vector?} target - The object to be populated. If provided,
     * the function returns this object instead of creating a new one.
     */
    public solverContactPoint(i: number, target?: Vector): Vector | null {
        const exists = this.raw.solver_contact_point(
            this.bodies.raw,
            i,
            scratchBuffer,
        );
        return exists ? VectorOps.fromBuffer(scratchBuffer, target) : null;
    }

    /** Current world-space solver anchor on side 1; includes skin/hook offsets. */
    public solverContactPoint1(i: number, target?: Vector): Vector | null {
        if (!Number.isSafeInteger(i) || i < 0 || i > 0xffffffff) return null;
        const exists = this.raw.solver_contact_point1(this.bodies.raw, i, scratchBuffer);
        return exists ? VectorOps.fromBuffer(scratchBuffer, target) : null;
    }

    /** Current world-space solver anchor on side 2; includes skin/hook offsets. */
    public solverContactPoint2(i: number, target?: Vector): Vector | null {
        if (!Number.isSafeInteger(i) || i < 0 || i > 0xffffffff) return null;
        const exists = this.raw.solver_contact_point2(this.bodies.raw, i, scratchBuffer);
        return exists ? VectorOps.fromBuffer(scratchBuffer, target) : null;
    }

    /**
     * Current anchor separation along the stored solver normal (negative means overlap).
     * This is not a fresh collision query or a bound on unsampled material surfaces.
     * Returns null for an invalid index. Unlike solverContactDist, uses current poses.
     */
    public solverContactSeparation(i: number): number | null {
        if (!Number.isSafeInteger(i) || i < 0 || i > 0xffffffff) return null;
        return this.raw.solver_contact_separation(this.bodies.raw, i) ?? null;
    }

    /** Cached distance at the last contact update; does not track subsequent motion. */
    public solverContactDist(i: number): number {
        return this.raw.solver_contact_dist(i);
    }

    /**
     * The friction coefficient applied to this manifold's solver contacts. It is combined
     * once per manifold, so every solver contact of this manifold shares it.
     */
    public friction(): number {
        return this.raw.friction();
    }

    /**
     * The restitution coefficient applied to this manifold's solver contacts. It is
     * combined once per manifold, so every solver contact of this manifold shares it.
     */
    public restitution(): number {
        return this.raw.restitution();
    }

    /**
     * The tangent (surface) velocity of the `i`-th solver contact point.
     *
     * @param {number} i - The index of the solver contact to read.
     * @param {Vector?} target - The object to be populated. If provided,
     * the function returns this object instead of creating a new one.
     */
    public solverContactTangentVelocity(i: number, target?: Vector): Vector {
        this.raw.solver_contact_tangent_velocity(i, scratchBuffer);
        return VectorOps.fromBuffer(scratchBuffer, target);
    }
}

/** Read-only solver view; geometric subshape and local-surface queries are excluded. */
export type SolverContactManifold = Pick<TempContactManifold,
    'normal' | 'numSolverContacts' | 'solverContactPoint' | 'solverContactDist' |
    'friction' | 'restitution' | 'solverContactTangentVelocity' |
    'solverContactPoint1' | 'solverContactPoint2' | 'solverContactSeparation'>;
