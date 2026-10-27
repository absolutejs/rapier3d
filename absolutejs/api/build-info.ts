/** Artifact identity for diagnostics. Importing the build-info subpath loads no WASM. */
export interface PhysicsBuildInfo {
    readonly schemaVersion: 1;
    readonly scope: 'package';
    readonly packageName: '@absolutejs/rapier3d';
    readonly packageVersion: string;
    readonly qualifiedKernelRelease: string;
    readonly upstream: string;
    readonly engine: string;
    /** Collision library version and exact Cargo source identity used by this build. */
    readonly collisionLibraryVersion: string;
    readonly collisionSource: string;
    readonly bindings: string;
    readonly bindgen: string;
    readonly wasmSha256: string;
    readonly wasmBytes: number;
    /** Whether this kernel changes the pinned upstream solver, not the prior package version. */
    readonly solverChanges: boolean;
}
