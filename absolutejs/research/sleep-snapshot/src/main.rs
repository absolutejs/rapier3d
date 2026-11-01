use rapier3d::{dynamics::*, geometry::*, math::Vector};
use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize)]
struct World {
    gravity: Vector,
    integration_parameters: IntegrationParameters,
    islands: IslandManager,
    broad_phase: DefaultBroadPhase,
    narrow_phase: NarrowPhase,
    bodies: RigidBodySet,
    colliders: ColliderSet,
    impulse_joints: ImpulseJointSet,
    multibody_joints: MultibodyJointSet,
    soft_bodies: SoftBodySet,
}
#[derive(Serialize, Deserialize)]
struct Snapshot { world: World, pending_islands: PendingIslandEvents }
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let file = std::env::args().nth(1).ok_or("snapshot path required")?;
    let bytes = std::fs::read(&file)?;
    if bytes.len() < 12 || bytes.len() > 16*1024*1024 || &bytes[..8] != b"ABSJS3DS" || bytes[8..12] != 1u32.to_le_bytes() { return Err("invalid bounded snapshot envelope".into()); }
    let snapshot: Snapshot = bincode::deserialize(&bytes[12..])?;
    // Cross-target decoding is evidence only when the entire native payload
    // round-trips exactly; never infer compatibility from partial field reads.
    if bincode::serialize(&snapshot)? != bytes[12..] { return Err("host serialization does not reproduce captured native bytes".into()); }
    let w=&snapshot.world;
    let bodies:Vec<_>=w.bodies.iter().filter(|(_,b)|b.is_dynamic()).map(|(h,b)|serde_json::json!({
        "handle":h.into_raw_parts(),"mass":b.mass(),"maxExtent":b.mass_properties().max_extent(),
        "activation":b.activation(),"pose":b.position(),"linearVelocity":b.linvel(),"angularVelocity":b.angvel()
    })).collect();
    println!("{}",serde_json::to_string_pretty(&serde_json::json!({"snapshot":file,"exactSerializationRoundTrip":true,"stepDt":w.integration_parameters.dt,"lengthUnit":w.integration_parameters.length_unit,"dynamicBodies":bodies}))?);
    Ok(())
}
