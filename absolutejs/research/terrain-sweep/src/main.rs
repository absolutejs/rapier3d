use rapier3d::{dynamics::PendingIslandEvents, prelude::*};
use serde_json::json;
use std::{fs, path::Path};
fn decode(bytes: &[u8]) -> Result<PhysicsWorld, Box<dyn std::error::Error>> {
    if bytes.len() < 12
        || bytes.len() > 16 * 1024 * 1024
        || &bytes[..12] != b"ABSJS3DS\x01\x00\x00\x00"
    {
        return Err("invalid bounded snapshot".into());
    }
    let (mut world, pending): (PhysicsWorld, PendingIslandEvents) =
        bincode::deserialize(&bytes[12..])?;
    if bincode::serialize(&(&world, &pending))? != bytes[12..] {
        return Err("snapshot does not exactly round-trip on host".into());
    }
    pending.restore(
        &mut world.impulse_joints,
        &mut world.multibody_joints,
        &mut world.soft_bodies,
    );
    Ok(world)
}
fn bodies(w: &PhysicsWorld) -> serde_json::Value {
    json!(w.bodies.iter().filter(|(_,b)|b.is_dynamic()).map(|(h,b)|json!({"handle":h.into_raw_parts(),"pose":b.position(),"linear":b.linvel(),"angular":b.angvel(),"sleeping":b.is_sleeping()})).collect::<Vec<_>>())
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 4 {
        return Err("expected before.bin after.bin output-prefix".into());
    }
    let mut w = decode(&fs::read(&args[1])?)?;
    let expected = decode(&fs::read(&args[2])?)?;
    let input_bodies = bodies(&w);
    w.physics_pipeline.counters.enable();
    #[cfg(feature = "probe")]
    rapier3d::counters::sweep_probe::reset();
    w.step();
    let output_bodies = bodies(&w);
    let c = &w.physics_pipeline.counters;
    let mut result = json!({"scope":"one host step from exact WASM capture; host timings are not browser timings","inputBodies":input_bodies,"outputBodies":output_bodies,"wasmBodiesExact":output_bodies==bodies(&expected),"stepMs":c.step_time.time_ms(),"ccdMs":c.stages.ccd_time.time_ms(),"toiMs":c.ccd.toi_computation_time.time_ms()});
    #[cfg(feature = "probe")]
    {
        result["probe"] = json!(rapier3d::counters::sweep_probe::read());
    }
    let pending =
        PendingIslandEvents::capture(&w.impulse_joints, &w.multibody_joints, &w.soft_bodies);
    fs::write(
        Path::new(&format!("{}.bin", args[3])),
        bincode::serialize(&(&w, pending))?,
    )?;
    fs::write(
        Path::new(&format!("{}.json", args[3])),
        serde_json::to_vec_pretty(&result)?,
    )?;
    println!("{}", result);
    Ok(())
}
