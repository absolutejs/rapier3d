import rock from './fixtures/convex-stone-mass.json';
export function verifyConvexFacePreservation(R: typeof import('../../dist/rapier.mjs').default) {
 const world=new R.World({x:0,y:0,z:0});
 try {
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic());
  const desc=R.ColliderDesc.convexMesh(Float32Array.from(rock.positions),Uint32Array.from(rock.indices));
  if(!desc)throw Error('Captured convex mesh rejected');
  world.createCollider(desc.setDensity(rock.density),body);
  const relativeMassError=Math.abs(body.mass()-rock.expectedMass)/rock.expectedMass;
  if(relativeMassError>2e-6)throw Error('Browser convex facets changed rendered mass');
  const snapshot=world.takeSnapshot(),restored=R.World.restoreSnapshot(snapshot);
  try {const replay=restored.takeSnapshot();if(snapshot.length!==replay.length||snapshot.some((v,i)=>v!==replay[i]))throw Error('Browser convex snapshot mismatch');}
  finally{restored.free();}
  return {relativeMassError,mass:body.mass(),expectedMass:rock.expectedMass,snapshotExact:true};
 }finally{world.free();}
}
