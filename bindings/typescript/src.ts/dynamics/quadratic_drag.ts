/** One scalar velocity-dependent resistance channel. Use one consistent length
 * unit for speed, impulse, resistance and energy; mass remains kg. */
export type QuadraticDragInput = {
    /** Body-point speed minus fluid speed along the impulse direction. */
    relativeSpeed: number;
    /** Fluid speed along the same direction, for reservoir-work accounting. */
    fluidSpeed: number;
    /** Positive effective inverse mass including the point's angular response. */
    inverseEffectiveMass: number;
    /** Nonnegative coefficient k in resistance = -k |v| v. No default Cd. */
    quadraticResistance: number;
    dt: number;
};

/** Backward-Euler quadratic resistance, solved analytically without reversal.
 * Pure calculation: does not change a body, infer exposure, or choose drag
 * coefficients. For point impulses the caller supplies the complete effective
 * inverse mass, including rotational/coupled response. Returned work is the
 * exact frozen-mass impulse work, not a time-continuous CFD energy estimate.
 * Native application precision must be checked independently by the caller. */
export function solveQuadraticDragImpulse(input: QuadraticDragInput) {
    const {relativeSpeed: v, fluidSpeed: u, inverseEffectiveMass: inverseMass,
        quadraticResistance: k, dt} = input;
    if (![v,u,inverseMass,k,dt].every(Number.isFinite) || inverseMass <= 0 || k < 0 || dt < 0)
        throw Error('Invalid quadratic drag channel');
    if (v === 0 || k === 0 || dt === 0) return {
        impulse: 0, relativeSpeedAfter: v, dissipatedEnergy: 0,
        bodyWork: 0, reservoirWork: 0
    };
    const a = dt * k * inverseMass * Math.abs(v);
    if (!Number.isFinite(a) || a === 0)
        throw Error('Unrepresentable quadratic drag scale');
    // hypot avoids squaring a large scale. Rationalized loss avoids subtracting
    // nearly equal speeds in weak drag; the ratio remains accurate in stiff drag.
    const root = Math.hypot(1, 2 * Math.sqrt(a));
    const ratio = 2 / (1 + root);
    const loss = a < 1 ? 2 * a / (1 + 2 * a + root) : 1 - ratio;
    const impulse = -(v * loss) / inverseMass;
    const relativeSpeedAfter = v * ratio;
    const relativeWork = impulse * (v + 0.5 * inverseMass * impulse);
    const reservoirWork = impulse * u;
    const bodyWork = relativeWork + reservoirWork;
    if (![impulse,relativeSpeedAfter,relativeWork,reservoirWork,bodyWork].every(Number.isFinite) ||
        impulse === 0 || relativeWork > 0)
        throw Error('Unrepresentable quadratic drag result');
    return {impulse,relativeSpeedAfter,dissipatedEnergy:-relativeWork,bodyWork,reservoirWork};
}
