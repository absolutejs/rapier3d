import type {Vector} from '../math';
import {solveQuadraticDragImpulse} from './quadratic_drag';
export type QuadraticDragPatch = {
    /** World-space offset from the mass centre, in the chosen length unit. */
    offset: Vector;
    /** Nonzero direction; normalized by the solver without changing the input. */
    direction: Vector;
    fluidVelocity: Vector;
    quadraticResistance: number;
    /** Skip nonpositive relative speed, for a caller-selected exposed side. */
    oneSided: boolean;
};
export type QuadraticDragPatchesInput = {
    linearVelocity: Vector;
    angularVelocity: Vector;
    /** Diagonal translational inverse mass, including locked axes. */
    inverseMass: Vector;
    /** Symmetric world inverse inertia: xx, xy, xz, yy, yz, zz. */
    inverseInertia: readonly [number,number,number,number,number,number];
    patches: readonly QuadraticDragPatch[];
    dt: number;
};
const finiteVector=(v:Vector)=>v && [v.x,v.y,v.z].every(Number.isFinite);
const copy=(v:Vector):Vector=>({x:v.x,y:v.y,z:v.z});
const zero=():Vector=>({x:0,y:0,z:0});
/** Sequential frozen-pose patch solve in JS double precision, returning one
 * accumulated linear/angular impulse. This avoids repeated native Float32
 * velocity rounding. Patch order is explicit and finite-step convergence must
 * be measured; no fluid exposure or coefficients are inferred. Free rigid-body
 * response only: articulated/constraint-coupled response is not represented by
 * this block-diagonal inverse mass. Inputs are borrowed; outputs are owned. */
export function solveQuadraticDragPatches(input:QuadraticDragPatchesInput) {
    const {linearVelocity,angularVelocity,inverseMass,inverseInertia:m,patches,dt}=input;
    if(![linearVelocity,angularVelocity,inverseMass].every(finiteVector) ||
        [inverseMass.x,inverseMass.y,inverseMass.z].some(v=>v<0) ||
        !Array.isArray(m)||m.length!==6||!m.every(Number.isFinite)||
        !Array.isArray(patches)||patches.length>4096||!Number.isFinite(dt)||dt<0)
        throw Error('Invalid quadratic drag patch input');
    // Principal minors characterize a symmetric positive-semidefinite matrix.
    // Scale first so checking ordinary physical coefficients cannot overflow.
    const scale=Math.max(...m.map(Math.abs));
    if(scale>0){
        const [a,b,c,d,e,f]=m.map(v=>v/scale);
        if(a<0||d<0||f<0||a*d-b*b<0||a*f-c*c<0||d*f-e*e<0||
            a*d*f+2*b*c*e-a*e*e-d*c*c-f*b*b<0)
            throw Error('Indefinite inverse inertia in drag patches');
    }
    const prepared=patches.map(p=>{
        if(!p||![p.offset,p.direction,p.fluidVelocity].every(finiteVector)||
            !Number.isFinite(p.quadraticResistance)||p.quadraticResistance<0||typeof p.oneSided!=='boolean')
            throw Error('Invalid quadratic drag patch');
        const length=Math.hypot(p.direction.x,p.direction.y,p.direction.z);
        if(!(length>0)||!Number.isFinite(length))throw Error('Invalid drag patch direction');
        return {patch:p,n:{x:p.direction.x/length,y:p.direction.y/length,z:p.direction.z/length}};
    });
    const linear=copy(linearVelocity),angular=copy(angularVelocity),impulse=zero(),angularImpulse=zero();
    let dissipatedEnergy=0,reservoirWork=0,bodyWork=0,activePatches=0,lockedPatches=0;
    for(const {patch:p,n} of prepared){
        if(dt===0||p.quadraticResistance===0)continue;
        const r=p.offset;
        const point={x:linear.x+angular.y*r.z-angular.z*r.y,
            y:linear.y+angular.z*r.x-angular.x*r.z,z:linear.z+angular.x*r.y-angular.y*r.x};
        const fluidSpeed=p.fluidVelocity.x*n.x+p.fluidVelocity.y*n.y+p.fluidVelocity.z*n.z;
        const relativeSpeed=point.x*n.x+point.y*n.y+point.z*n.z-fluidSpeed;
        if(relativeSpeed===0||(p.oneSided&&relativeSpeed<0))continue;
        const c={x:r.y*n.z-r.z*n.y,y:r.z*n.x-r.x*n.z,z:r.x*n.y-r.y*n.x};
        const response={x:m[0]*c.x+m[1]*c.y+m[2]*c.z,
            y:m[1]*c.x+m[3]*c.y+m[4]*c.z,z:m[2]*c.x+m[4]*c.y+m[5]*c.z};
        const inverseEffectiveMass=inverseMass.x*n.x*n.x+inverseMass.y*n.y*n.y+inverseMass.z*n.z*n.z+
            c.x*response.x+c.y*response.y+c.z*response.z;
        if(inverseEffectiveMass===0){lockedPatches++;continue;}
        const load=solveQuadraticDragImpulse({relativeSpeed,fluidSpeed,inverseEffectiveMass,
            quadraticResistance:p.quadraticResistance,dt});
        const j=load.impulse;
        linear.x+=inverseMass.x*j*n.x;linear.y+=inverseMass.y*j*n.y;linear.z+=inverseMass.z*j*n.z;
        angular.x+=j*response.x;angular.y+=j*response.y;angular.z+=j*response.z;
        impulse.x+=j*n.x;impulse.y+=j*n.y;impulse.z+=j*n.z;
        angularImpulse.x+=j*c.x;angularImpulse.y+=j*c.y;angularImpulse.z+=j*c.z;
        dissipatedEnergy+=load.dissipatedEnergy;reservoirWork+=load.reservoirWork;bodyWork+=load.bodyWork;activePatches++;
    }
    if(![linear,angular,impulse,angularImpulse].every(finiteVector)||
        ![dissipatedEnergy,reservoirWork,bodyWork].every(Number.isFinite))
        throw Error('Unrepresentable quadratic patch result');
    return {impulse,angularImpulse,linearVelocity:linear,angularVelocity:angular,
        dissipatedEnergy,reservoirWork,bodyWork,activePatches,lockedPatches};
}
