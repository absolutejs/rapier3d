import {beforeAll, expect, test} from 'bun:test';
import R from '@absolutejs/rapier3d';
beforeAll(async()=>{await R.init();});
const solve=R.solveQuadraticDragImpulse;
const base={relativeSpeed:3,fluidSpeed:4,inverseEffectiveMass:.5,quadraticResistance:2,dt:.25};
test('implicit quadratic impulse closes the relative and moving-reservoir energy ledger',()=>{
    const r=solve(Object.freeze(base));
    expect(r.relativeSpeedAfter).toBeCloseTo(2,14);
    expect(r.impulse).toBeCloseTo(-2,14);
    expect(r.dissipatedEnergy).toBeCloseTo(5,14);
    expect(r.reservoirWork).toBeCloseTo(-8,14);
    expect(r.bodyWork).toBeCloseTo(-13,14);
    const boost=solve({...base,fluidSpeed:104});
    expect(boost.impulse).toBe(r.impulse);
    expect(boost.dissipatedEnergy).toBe(r.dissipatedEnergy);
    expect(boost.bodyWork-r.bodyWork).toBeCloseTo(r.impulse*100,12);
    const reverse=solve({...base,relativeSpeed:-3,fluidSpeed:-4});
    expect(reverse.impulse).toBe(-r.impulse);
    expect(reverse.bodyWork).toBe(r.bodyWork);
});
test('quadratic resistance stays dissipative and solves the implicit equation across weak and stiff scales',()=>{
    for(const speed of [1e-8,1e-3,1,1e3,1e8])for(const k of [1e-12,1e-3,1,1e3,1e12])
    for(const inverseEffectiveMass of [1e-9,1e-3,1,1e3,1e9])for(const dt of [1e-6,1/60,1])for(const sign of [-1,1]){
        const v=sign*speed,r=solve({relativeSpeed:v,fluidSpeed:0,inverseEffectiveMass,quadraticResistance:k,dt});
        expect(r.impulse*v).toBeLessThan(0);
        expect(r.relativeSpeedAfter*v).toBeGreaterThanOrEqual(0);
        expect(Math.abs(r.relativeSpeedAfter)).toBeLessThanOrEqual(speed);
        expect(r.dissipatedEnergy).toBeGreaterThanOrEqual(0);
        expect(r.bodyWork).toBeLessThanOrEqual(0);
        const residual=r.relativeSpeedAfter+dt*k*inverseEffectiveMass*r.relativeSpeedAfter*Math.abs(r.relativeSpeedAfter)-v;
        expect(Math.abs(residual)/speed).toBeLessThan(2e-14);
    }
});
test('zero channels are exact no-ops; malformed and unrepresentable channels fail',()=>{
    for(const patch of [{dt:0},{relativeSpeed:0},{quadraticResistance:0}]){
        const input={...base,...patch},r=solve(input);
        expect(r.impulse).toBe(0);expect(r.bodyWork).toBe(0);expect(r.relativeSpeedAfter).toBe(input.relativeSpeed);
    }
    for(const patch of [{dt:-1},{dt:NaN},{fluidSpeed:Infinity},{relativeSpeed:NaN},{inverseEffectiveMass:0},{inverseEffectiveMass:-1},{quadraticResistance:-1},
        {relativeSpeed:1e308,quadraticResistance:1e308},{dt:1e-300,quadraticResistance:1e-300}])
        expect(()=>solve({...base,...patch})).toThrow();
});
test('consistent centimetre scaling preserves dissipation in physical units',()=>{
    const m=solve(base),u=100,c=solve({...base,relativeSpeed:base.relativeSpeed*u,fluidSpeed:base.fluidSpeed*u,quadraticResistance:base.quadraticResistance/u});
    expect(c.impulse/u).toBeCloseTo(m.impulse,13);
    expect(c.bodyWork/u**2).toBeCloseTo(m.bodyWork,12);
    expect(c.dissipatedEnergy/u**2).toBeCloseTo(m.dissipatedEnergy,12);
});
test('backward Euler drag converges to the continuous scalar solution',()=>{
    const errors=[];
    for(const steps of [20,40,80,160]){
        let v=3;for(let i=0;i<steps;i++)v=solve({...base,relativeSpeed:v,dt:1/steps}).relativeSpeedAfter;
        errors.push(Math.abs(v-3/4));
    }
    for(let i=1;i<errors.length;i++)expect(errors[i]!/errors[i-1]!).toBeLessThan(.55);
});
test('off-centre native impulses match effective-mass speed and energy in metre and centimetre worlds',()=>{
    for(const u of [1,100]){
        const world=new R.World({x:0,y:0,z:0});
        try{
            const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setRotation({x:0,y:Math.sin(.2),z:0,w:Math.cos(.2)}));
            world.createCollider(R.ColliderDesc.cuboid(.4*u,.2*u,.1*u).setDensity(31.25/u**3),b);
            b.recomputeMassPropertiesFromColliders();b.setLinvel({x:2*u,y:.3*u,z:0},true);b.setAngvel({x:.2,y:.1,z:.5},true);
            const point={x:.1*u,y:.3*u,z:.2*u},com=b.worldCom(),a={x:0,y:point.z-com.z,z:-(point.y-com.y)};
            const inv=b.effectiveWorldInvInertia();
            const inverseEffectiveMass=b.effectiveInvMass().x+a.y*a.y*inv.m22+2*a.y*a.z*inv.m23+a.z*a.z*inv.m33;
            const fluidSpeed=.7*u,relativeSpeed=b.velocityAtPoint(point).x-fluidSpeed;
            const energy=()=>{
                const v=b.linvel(),w=b.angvel(),m=b.effectiveAngularInertia();
                return .5*b.mass()*(v.x*v.x+v.y*v.y+v.z*v.z)+.5*(m.m11*w.x*w.x+m.m22*w.y*w.y+m.m33*w.z*w.z+2*m.m12*w.x*w.y+2*m.m13*w.x*w.z+2*m.m23*w.y*w.z);
            };
            const before=energy(),r=solve({relativeSpeed,fluidSpeed,inverseEffectiveMass,quadraticResistance:10/u,dt:1/60});
            b.applyImpulseAtPoint({x:r.impulse,y:0,z:0},point,true);
            expect(Math.abs((b.velocityAtPoint(point).x-fluidSpeed-r.relativeSpeedAfter)/u)).toBeLessThan(2e-6);
            expect(Math.abs((energy()-before-r.bodyWork)/u**2)).toBeLessThan(2e-6);
            expect((energy()-before-r.reservoirWork)/u**2).toBeLessThan(0);
        }finally{world.free();}
    }
});
