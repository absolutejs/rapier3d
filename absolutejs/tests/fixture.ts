export function fixture(api: any, hz=960, tilt=0) {
 const w=new api.World({x:0,y:-981,z:0});w.timestep=1/hz;
 w.integrationParameters.lengthUnit=100;w.integrationParameters.normalizedAllowedLinearError=.00001;w.integrationParameters.normalizedPredictionDistance=.002;w.integrationParameters.contact_natural_frequency=240;w.integrationParameters.maxCcdSubsteps=4;
 w.createCollider(api.ColliderDesc.cuboid(2000,100,2000).setTranslation(0,-100,0).setFriction(.7).setRestitution(.1));
 const q={x:Math.sin(tilt/2),y:0,z:0,w:Math.cos(tilt/2)};
 const make=(mass:number,inertia:number)=>w.createRigidBody(api.RigidBodyDesc.dynamic().setTranslation(0,200,0).setRotation(q).setCcdEnabled(true).setAdditionalSolverIterations(32).setAdditionalMassProperties(mass,{x:0,y:0,z:0},{x:inertia*1e4,y:inertia*1e4,z:inertia*1e4},{x:0,y:0,z:0,w:1}));
 const m=600*.02**3,M=600*.04**3;
 const chip=make(m,m*.02**2/6),shell=make(M-m,(M*.04**2-m*.02**2)/6);
 const a=w.createCollider(api.ColliderDesc.cuboid(1,1,1).setDensity(0).setFriction(.7).setRestitution(.1),chip);
 const sizes=[[.5,2,2],[.5,2,2],[1,.5,2],[1,.5,2],[1,1,.5],[1,1,.5]];
 const positions=[{x:-1.5,y:0,z:0},{x:1.5,y:0,z:0},{x:0,y:-1.5,z:0},{x:0,y:1.5,z:0},{x:0,y:0,z:-1.5},{x:0,y:0,z:1.5}];
 const b=w.createCollider(api.ColliderDesc.compound(sizes.map(s=>api.ColliderDesc.cuboid(s[0]!,s[1]!,s[2]!).shape),positions,sizes.map(()=>({x:0,y:0,z:0,w:1}))).setDensity(0).setFriction(.7).setRestitution(.1),shell);
 return {w,a,b,bodies:[chip,shell]};
}
