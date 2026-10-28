use rapier3d::prelude::*;
use rapier3d::dynamics::PendingIslandEvents;
use rapier3d::geometry::DefaultBroadPhase;
use serde::de::DeserializeOwned;
use serde_json::{json, Value};
use std::{fs, io::Cursor};

fn read<T: DeserializeOwned>(cursor: &mut Cursor<&[u8]>, name: &str, ranges: &mut Vec<Value>) -> T {
    let start = cursor.position();
    let value = bincode::deserialize_from(&mut *cursor).unwrap();
    ranges.push(json!({ "field": name, "start": start, "end": cursor.position() }));
    value
}

fn main() {
    let args: Vec<_> = std::env::args().collect();
    assert_eq!(args.len(), 3, "Expected snapshot input and decoded receipt output");
    let data = fs::read(&args[1]).unwrap();
    assert_eq!(&data[..12], b"ABSJS3DS\x01\x00\x00\x00");
    let mut cursor = Cursor::new(data.as_slice()); cursor.set_position(12);
    let mut ranges = Vec::new();
    let _: Vector = read(&mut cursor, "gravity", &mut ranges);
    let _: IntegrationParameters = read(&mut cursor, "integration_parameters", &mut ranges);
    let _: IslandManager = read(&mut cursor, "islands", &mut ranges);
    let _: DefaultBroadPhase = read(&mut cursor, "broad_phase", &mut ranges);
    let _: NarrowPhase = read(&mut cursor, "narrow_phase", &mut ranges);
    let _: RigidBodySet = read(&mut cursor, "bodies", &mut ranges);
    let _: ColliderSet = read(&mut cursor, "colliders", &mut ranges);
    let impulse: ImpulseJointSet = read(&mut cursor, "impulse_joints", &mut ranges);
    let multi: MultibodyJointSet = read(&mut cursor, "multibody_joints", &mut ranges);
    let _: SoftBodySet = read(&mut cursor, "soft_bodies", &mut ranges);
    let _: PendingIslandEvents = read(&mut cursor, "pending_islands", &mut ranges);
    assert_eq!(cursor.position() as usize, data.len(), "Unaccounted snapshot bytes");
    let impulse = serde_json::to_value(impulse).unwrap();
    let multi = serde_json::to_value(multi).unwrap();
    // These are the final three serialized fields of MultibodyJointSet. Size
    // them using the actual handle types, then decode their original byte order
    // without passing through a hash-set reconstruction.
    let wake: Vec<RigidBodyHandle> = serde_json::from_value(multi["to_wake_up"].clone()).unwrap();
    let join: Vec<(RigidBodyHandle, RigidBodyHandle)> = serde_json::from_value(multi["to_join"].clone()).unwrap();
    let epoch: u32 = serde_json::from_value(multi["topology_epoch"].clone()).unwrap();
    let end = ranges.iter().find(|v| v["field"] == "multibody_joints").unwrap()["end"].as_u64().unwrap();
    let start = end - bincode::serialized_size(&wake).unwrap() - bincode::serialized_size(&join).unwrap() - bincode::serialized_size(&epoch).unwrap();
    let mut queue_cursor = Cursor::new(data.as_slice()); queue_cursor.set_position(start);
    let mut queue_ranges = Vec::new();
    let raw_wake: Vec<RigidBodyHandle> = read(&mut queue_cursor, "multibody.to_wake_up", &mut queue_ranges);
    let raw_join: Vec<(RigidBodyHandle, RigidBodyHandle)> = read(&mut queue_cursor, "multibody.to_join", &mut queue_ranges);
    let raw_epoch: u32 = read(&mut queue_cursor, "multibody.topology_epoch", &mut queue_ranges);
    assert_eq!(raw_epoch, epoch); assert_eq!(queue_cursor.position(), end);
    let mut wake_members = wake.clone(); wake_members.sort_by_key(|h| h.into_raw_parts());
    let mut raw_members = raw_wake.clone(); raw_members.sort_by_key(|h| h.into_raw_parts());
    assert_eq!(wake_members, raw_members);
    let mut join_members = join.clone(); join_members.sort_by_key(|(a,b)| (a.into_raw_parts(), b.into_raw_parts()));
    let mut raw_join_members = raw_join.clone(); raw_join_members.sort_by_key(|(a,b)| (a.into_raw_parts(), b.into_raw_parts()));
    assert_eq!(join_members, raw_join_members);
    let result = json!({ "bytes": data.len(), "ranges": ranges, "queue_ranges": queue_ranges,
        "impulse": { "to_wake_up": impulse["to_wake_up"], "to_join": impulse["to_join"] },
        "multibody": { "to_wake_up": multi["to_wake_up"], "to_join": multi["to_join"] },
        "serialized_multibody_wake_order": raw_wake,
        "serialized_multibody_join_order": raw_join
    });
    fs::write(&args[2], format!("{}\n", serde_json::to_string_pretty(&result).unwrap())).unwrap();
    println!("Decoded {} bytes and all field boundaries", data.len());
}
