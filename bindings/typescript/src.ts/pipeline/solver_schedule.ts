import type {SolverScheduleStats} from './world';
/** Validate a copied schedule without coercion, property getters or mutation.
 * Extra application metadata is ignored. This checks internal scalar consistency,
 * not provenance, freshness, per-body identity or physical solver correctness. */
export function isSolverScheduleStats(value: unknown): value is SolverScheduleStats {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    try {
        const keys = ['groupPasses', 'rigidBodyPasses', 'rigidBodySubsteps',
            'minSubsteps', 'maxSubsteps', 'minSubstepDt', 'maxSubstepDt'];
        const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(value, key));
        if (descriptors.some(d => !d || !('value' in d))) return false;
        const [groups, bodies, visits, minimum, maximum, minDt, maxDt] = descriptors.map(d => d!.value);
        const count = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
        if (![groups, bodies, visits].every(count)) return false;
        if (groups === 0) return bodies === 0 && visits === 0 && minimum === null && maximum === null && minDt === null && maxDt === null;
        if (bodies < groups || !count(minimum) || minimum < 1 || !count(maximum) || maximum < minimum) return false;
        if (typeof minDt !== 'number' || typeof maxDt !== 'number' || !Number.isFinite(minDt) || !Number.isFinite(maxDt) || minDt < 0 || maxDt < minDt) return false;
        // Exact integer bounds avoid overflowing a JS multiplication at the serialization boundary.
        return BigInt(visits) >= BigInt(bodies) * BigInt(minimum) && BigInt(visits) <= BigInt(bodies) * BigInt(maximum);
    } catch { return false; }
}
