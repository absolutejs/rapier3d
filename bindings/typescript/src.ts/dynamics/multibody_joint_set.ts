import {RawMultibodyJointSet} from "../raw";
import {Coarena} from "../coarena";
import {RigidBodySet} from "./rigid_body_set";
import {
    MultibodyJoint,
    MultibodyJointHandle,
    RevoluteMultibodyJoint,
    FixedMultibodyJoint,
    PrismaticMultibodyJoint,
    // #if DIM3
    SphericalMultibodyJoint,
    // #endif
} from "./multibody_joint";
import {ImpulseJointHandle, JointData, JointType} from "./impulse_joint";
import {IslandManager} from "./island_manager";
import {ColliderHandle} from "../geometry";
import {RigidBodyHandle} from "./rigid_body";

/**
 * A set of joints.
 *
 * To avoid leaking WASM resources, this MUST be freed manually with `jointSet.free()`
 * once you are done using it (and all the joints it created).
 */
export class MultibodyJointSet {
    raw: RawMultibodyJointSet;
    private map: Coarena<MultibodyJoint>;

    /**
     * Release the WASM memory occupied by this joint set.
     */
    public free() {
        if (!!this.raw) {
            this.raw.free();
        }
        this.raw = undefined;

        if (!!this.map) {
            this.map.clear();
        }
        this.map = undefined;
    }

    constructor(raw?: RawMultibodyJointSet) {
        this.raw = raw || new RawMultibodyJointSet();
        this.map = new Coarena<MultibodyJoint>();
        // Initialize the map with the existing elements, if any.
        if (raw) {
            raw.forEachJointHandle((handle: MultibodyJointHandle) => {
                this.map.set(handle, MultibodyJoint.newTyped(this.raw, handle));
            });
        }
    }

    /** Returns an owned copy of articulation-wide damping, or undefined for a stale handle. */
    public generalizedDamping(handle: MultibodyJointHandle): Float32Array | undefined {
        return this.raw.generalizedDamping(handle);
    }

    /**
     * Sets generalized damping for the entire articulation containing this joint,
     * including its free root. Body damping setters do not change this vector.
     * Entries follow native generalized-coordinate order; topology changes may
     * change its length and meaning. Read it again after changing joints.
     * Returns false without mutation for a removed handle, wrong length,
     * negative/nonfinite values, or values that overflow native float precision.
     * This does not wake sleeping bodies; callers must wake the affected bodies.
     */
    public setGeneralizedDamping(handle: MultibodyJointHandle, values: ArrayLike<number>): boolean {
        if (!Number.isSafeInteger(values.length) || values.length < 0) return false;
        const current = this.generalizedDamping(handle);
        if (!current || values.length !== current.length) return false;
        const copy = new Float32Array(values.length);
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return false;
            copy[i] = value;
            if (!Number.isFinite(copy[i])) return false;
        }
        return this.raw.setGeneralizedDamping(handle, copy);
    }

    /**
     * Creates a new joint and return its integer handle.
     *
     * @param desc - The joint's parameters.
     * @param parent1 - The handle of the first rigid-body this joint is attached to.
     * @param parent2 - The handle of the second rigid-body this joint is attached to.
     * @param wakeUp - Should the attached rigid-bodies be awakened?
     */
    public createJoint(
        desc: JointData,
        parent1: RigidBodyHandle,
        parent2: RigidBodyHandle,
        wakeUp: boolean,
    ): MultibodyJoint {
        const rawParams = desc.intoRaw();
        const handle = this.raw.createJoint(
            rawParams,
            parent1,
            parent2,
            wakeUp,
        );
        rawParams.free();
        let joint = MultibodyJoint.newTyped(this.raw, handle);
        this.map.set(handle, joint);
        return joint;
    }

    /**
     * Remove a joint from this set.
     *
     * @param handle - The integer handle of the joint.
     * @param wake_up - If `true`, the rigid-bodies attached by the removed joint will be woken-up automatically.
     */
    public remove(handle: MultibodyJointHandle, wake_up: boolean) {
        this.raw.remove(handle, wake_up);
        this.map.delete(handle);
    }

    /**
     * Internal function, do not call directly.
     * @param handle
     */
    public unmap(handle: MultibodyJointHandle) {
        this.map.delete(handle);
    }

    /**
     * Drops the wrappers of the joints the engine removed on its own (the joints of removed
     * soft bodies and clusters).
     */
    public unmapRemovedJoints() {
        for (let joint of this.map.getAll()) {
            if (!this.raw.contains(joint.handle)) {
                this.map.delete(joint.handle);
            }
        }
    }

    /**
     * The number of joints on this set.
     */
    public len(): number {
        return this.map.len();
    }

    /**
     * Does this set contain a joint with the given handle?
     *
     * @param handle - The joint handle to check.
     */
    public contains(handle: MultibodyJointHandle): boolean {
        return this.get(handle) != null;
    }

    /**
     * Gets the joint with the given handle.
     *
     * Returns `null` if no joint with the specified handle exists.
     *
     * @param handle - The integer handle of the joint to retrieve.
     */
    public get(handle: MultibodyJointHandle): MultibodyJoint | null {
        return this.map.get(handle);
    }

    /**
     * Applies the given closure to each joint contained by this set.
     *
     * @param f - The closure to apply.
     */
    public forEach(f: (joint: MultibodyJoint) => void) {
        this.map.forEach(f);
    }

    /**
     * Calls the given closure with the integer handle of each multibody joint attached to this rigid-body.
     *
     * @param f - The closure called with the integer handle of each multibody joint attached to the rigid-body.
     */
    public forEachJointHandleAttachedToRigidBody(
        handle: RigidBodyHandle,
        f: (handle: MultibodyJointHandle) => void,
    ) {
        this.raw.forEachJointAttachedToRigidBody(handle, f);
    }

    /**
     * Gets all joints in the list.
     *
     * @returns joint list.
     */
    public getAll(): MultibodyJoint[] {
        return this.map.getAll();
    }
}
