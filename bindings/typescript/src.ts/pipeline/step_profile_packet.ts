import type {PhysicsStepProfile, PhysicsStepSample} from './step_profile';
import type {SolverScheduleStats} from './world';
import {isSolverScheduleStats} from './solver_schedule';

type Cell = number | null | '-0';
/** Versioned numeric transport. The single '-0' tag preserves signed zero in JSON.
 * No user strings or arbitrary application metadata are encoded. */
export interface PhysicsStepProfilePacket {
    format: 'absolutejs-physics-step-profile/1';
    header: Cell[];
    contactSettings: Cell[][];
    solverSchedules: Cell[][];
    samples: Array<[Cell, 0 | 1, Cell, 0 | 1 | 2, Cell[] | null]>;
}
const FORMAT = 'absolutejs-physics-step-profile/1' as const;
const HEADER = ['sampleEvery','sampleStartStep','maxSamples','attemptedSteps','completedSteps','failedSteps','timedSteps','totalWallTimeMs','maxWallTimeMs','slowestStep','timingErrors','captureErrors','samplesOmittedForBudget'] as const;
const SCHEDULE = ['groupVisits','rigidBodyVisits','rigidBodySubsteps','minSubsteps','maxSubsteps','minSubstepDt','maxSubstepDt'] as const;
const TIMING = ['stepMs','collisionDetectionMs','solverMs','assemblyMs','resolutionMs','ccdMs'] as const;
const CONVERGENCE = ['compressionSolves','compressionIterations','compressionLimitHits','maxCompressionResidual','restitutionSolves','restitutionIterations','restitutionLimitHits','maxRestitutionResidual'] as const;
const ROTATION = ['acceptedSteps','nonphysicalInertiaRejections','rotationLimitRejections','invalidOrFailedSolves','maxNewtonIterations','maxResidualRadiansPerSecond'] as const;
const ASSEMBLY = ['acceptedSteps','nonphysicalInertiaRejections','rotationLimitRejections','invalidOrFailedSolves'] as const;
const fail = (): never => { throw new TypeError('Invalid bounded physics profile packet'); };
const count = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
const duration = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
function array(value: unknown, maximum: number, exact?: number): any[] {
    if (!Array.isArray(value) || value.length > maximum || (exact !== undefined && value.length !== exact)) return fail();
    // Fixed bounds precede iteration; sparse arrays and getters are not transport records.
    for (let i=0;i<value.length;i++) { const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!('value' in d))return fail(); }
    return value;
}
function cell(value: unknown): number | null {
    if (value === null) return null;
    if (value === '-0') return -0;
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail();
    return value;
}
const encodeCell = (value: unknown): Cell => {
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail();
    return Object.is(value,-0) ? '-0' : value;
};
const tuple = (value: unknown, size: number): Array<number|null> => array(value,size,size).map(cell);
const record = (keys: readonly string[], values: Array<number|null>): any => Object.fromEntries(keys.map((key,i)=>[key,values[i]]));
const values = (value: any, keys: readonly string[]): Cell[] => keys.map(key=>encodeCell(value[key]));

/** Decode bounded, owned readable observations. This validates encoding and
 * internal scalar consistency, not native provenance or physical correctness. */
export function decodePhysicsStepProfile(value: unknown): PhysicsStepProfile {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
    const p=value as PhysicsStepProfilePacket;
    if(p.format!==FORMAT)return fail();
    const header=tuple(p.header,HEADER.length), result=record(HEADER,header) as PhysicsStepProfile;
    for(const i of [0,1,2,3,4,5,6,10,11,12])if(!count(header[i]))return fail();
    if(result.sampleEvery<1||result.sampleEvery>1_000_000||result.sampleStartStep>1_000_000_000||result.maxSamples>256||result.completedSteps+result.failedSteps!==result.attemptedSteps||result.timedSteps>result.attemptedSteps)return fail();
    for(const i of [7,8])if(header[i]!==null&&!duration(header[i]))return fail();
    if(result.slowestStep!==null&&(!count(result.slowestStep)||result.slowestStep>=result.attemptedSteps))return fail();
    const rows=array(p.samples,result.maxSamples),settings=array(p.contactSettings,rows.length),schedules=array(p.solverSchedules,rows.length);
    result.contactSettings=settings.map(row=>{const a=tuple(row,4);if(!a.every(duration))return fail();return {contactSoftness:{naturalFrequency:a[0]!,dampingRatio:a[1]!},staticContactSoftness:{naturalFrequency:a[2]!,dampingRatio:a[3]!}};});
    result.solverSchedules=schedules.map(row=>{const s=record(SCHEDULE,tuple(row,7)) as SolverScheduleStats;if(!isSolverScheduleStats(s))return fail();return s;});
    result.samples=rows.map((row,i)=>{
        const a=array(row,5,5),step=cell(a[0]),wallTimeMs=cell(a[2]);
        if(!count(step)||step!==result.sampleStartStep+i*result.sampleEvery||step>=result.attemptedSteps||!([0,1] as unknown[]).includes(a[1])||!([0,1,2] as unknown[]).includes(a[3])||(wallTimeMs!==null&&!duration(wallTimeMs)))return fail();
        const outcome=a[1]===0?'completed':'threw',captureStatus=a[3]===0?'captured':a[3]===1?'step-threw':'capture-failed';
        if((outcome==='threw')!==(captureStatus==='step-threw'))return fail();
        let native: PhysicsStepSample['native']=null;
        if(captureStatus==='captured'){
            const n=tuple(a[4],30);
            for(let j=0;j<n.length;j++)if(j!==5&&!duration(n[j]))return fail();
            for(const j of [2,3,4,12,13,14,16,17,18,20,21,22,23,24,26,27,28,29])if(!count(n[j]))return fail();
            if(!(n[0]!>0)||n[2]!<1||n[3]!>=settings.length||(n[5]!==null&&!count(n[5]))||(n[5]??0)>=schedules.length)return fail();
            native={lengthUnit:n[0]!,timestep:n[1]!,solverIterations:n[2]!,contactSettingsIndex:n[3]!,ccdSubsteps:n[4]!,
                ...(n[5]===null?{}:{solverScheduleIndex:n[5]}),timings:record(TIMING,n.slice(6,12)),convergence:record(CONVERGENCE,n.slice(12,20)),freeRotation:record(ROTATION,n.slice(20,26)),freeAssembly:record(ASSEMBLY,n.slice(26,30))};
        }else if(a[4]!==null)return fail();
        return {step,outcome,wallTimeMs,captureStatus,native};
    });
    return result;
}

/** Encode the defined profile fields without rounding or losing observations.
 * Arrays are bounded before traversal. Decode to recover human-readable labels. */
export function encodePhysicsStepProfile(profile: PhysicsStepProfile): PhysicsStepProfilePacket {
    if(!profile||typeof profile!=='object')return fail();
    const rows=array(profile.samples,256),settings=array(profile.contactSettings,256),schedules=array(profile.solverSchedules,256);
    const packet: PhysicsStepProfilePacket={format:FORMAT,header:values(profile,HEADER),
        contactSettings:settings.map(s=>[encodeCell(s.contactSoftness.naturalFrequency),encodeCell(s.contactSoftness.dampingRatio),encodeCell(s.staticContactSoftness.naturalFrequency),encodeCell(s.staticContactSoftness.dampingRatio)]),
        solverSchedules:schedules.map(s=>values(s,SCHEDULE)),
        samples:rows.map(s=>{
            if(!s||!['completed','threw'].includes(s.outcome)||!['captured','step-threw','capture-failed'].includes(s.captureStatus))return fail();
            const n=s.native;
            const native=n===null?null:[...values(n,['lengthUnit','timestep','solverIterations','contactSettingsIndex','ccdSubsteps']),n.solverScheduleIndex===undefined?null:encodeCell(n.solverScheduleIndex),...values(n.timings,TIMING),...values(n.convergence,CONVERGENCE),...values(n.freeRotation,ROTATION),...values(n.freeAssembly,ASSEMBLY)];
            return [encodeCell(s.step),s.outcome==='completed'?0:1,encodeCell(s.wallTimeMs),s.captureStatus==='captured'?0:s.captureStatus==='step-threw'?1:2,native];
        })};
    // One bounded validation path keeps encoded and externally decoded contracts identical.
    decodePhysicsStepProfile(packet);
    return packet;
}
