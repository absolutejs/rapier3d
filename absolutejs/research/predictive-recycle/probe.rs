use rapier3d::{dynamics::PendingIslandEvents, prelude::*};
use serde_json::{json, Value};
use std::{fs, path::Path};

fn restore(bytes: &[u8]) -> PhysicsWorld {
    assert_eq!(&bytes[..12], b"ABSJS3DS\x01\x00\x00\x00");
    let (mut world, pending): (PhysicsWorld, PendingIslandEvents) =
        bincode::deserialize(&bytes[12..]).unwrap();
    pending.restore(&mut world.impulse_joints, &mut world.multibody_joints, &mut world.soft_bodies);
    #[cfg(feature = "parallel")]
    world.configure_thread_pool(2).unwrap();
    world
}

fn handle(value: &Value) -> ColliderHandle {
    let bits = value.as_f64().unwrap().to_bits();
    ColliderHandle::from_raw_parts(bits as u32, (bits >> 32) as u32)
}

fn distance(world: &PhysicsWorld, a: ColliderHandle, b: ColliderHandle) -> Option<f32> {
    let a = &world.colliders[a];
    let b = &world.colliders[b];
    let pose = |c: &Collider| match c.parent() {
        Some(parent) => world.bodies[parent].position() * c.position_wrt_parent().unwrap(),
        None => *c.position(),
    };
    rapier3d::parry::query::contact(&pose(a), a.shape(), &pose(b), b.shape(), 0.0)
        .unwrap().map(|contact| contact.dist / 100.0)
}

fn main() {
    let args: Vec<_> = std::env::args().collect();
    assert_eq!(args.len(), 3, "fixture directory and output receipt required");
    let root = Path::new(&args[1]);
    let captures: Value = serde_json::from_slice(&fs::read(root.join("captures.json")).unwrap()).unwrap();
    let mut rows = Vec::new();
    for capture in captures["rows"].as_array().unwrap() {
        let name = capture["name"].as_str().unwrap();
        let bytes = fs::read(root.join(format!("{name}-before.bin"))).unwrap();
        let a = handle(&capture["first"]);
        let b = handle(&capture["second"]);
        for recycle in [true, false] {
            let mut world = restore(&bytes);
            world.integration_parameters.contact_recycling = recycle;
            let initial = distance(&world, a, b);
            let mut distances = Vec::new();
            for _ in 0..8 {
                world.step();
                distances.push(distance(&world, a, b));
            }
            rows.push(json!({ "name": name, "recycle": recycle, "initialDistanceM": initial, "distancesM": distances }));
        }
    }
    let result = json!({ "scope": "Native replay of four captured onset pairs; two contact-recycling policies; no cross-backend byte identity claim", "rows": rows });
    fs::write(&args[2], serde_json::to_string_pretty(&result).unwrap() + "\n").unwrap();
    println!("{}", serde_json::to_string_pretty(&result).unwrap());
}

#[cfg(test)]
mod tests {
    use super::*;

    fn checkpoint(world: &PhysicsWorld) -> Vec<u8> {
        let pending = PendingIslandEvents::capture(&world.impulse_joints, &world.multibody_joints, &world.soft_bodies);
        bincode::serialize(&(world, pending)).unwrap()
    }

    #[test]
    fn captured_predictive_onsets_stay_below_one_millimetre_and_replay_exactly() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures");
        let captures: Value = serde_json::from_slice(&fs::read(root.join("captures.json")).unwrap()).unwrap();
        for capture in captures["rows"].as_array().unwrap() {
            let name = capture["name"].as_str().unwrap();
            let bytes = fs::read(root.join(format!("{name}-before.bin"))).unwrap();
            let mut world = restore(&bytes);
            let mut replay = restore(&bytes);
            assert!(world.integration_parameters.contact_recycling);
            for step in 0..8 {
                world.step(); replay.step();
                let d = distance(&world, handle(&capture["first"]), handle(&capture["second"]));
                assert!(d.is_none_or(|distance| distance >= -0.001), "{name} step {step}: {d:?}");
                assert!(checkpoint(&world) == checkpoint(&replay), "{name} replay step {step}");
            }
        }
    }

    #[test]
    fn resting_box_stacks_remain_upright_and_sleep() {
        for count in [1, 8, 16] {
            let mut world = PhysicsWorld::new();
            #[cfg(feature = "parallel")]
            world.configure_thread_pool(2).unwrap();
            world.integration_parameters.dt = 1.0 / 60.0;
            world.integration_parameters.num_solver_iterations = 8;
            world.colliders.insert(ColliderBuilder::cuboid(10.0, 0.5, 10.0)
                .translation(Vector::new(0.0, -0.5, 0.0)).friction(0.7));
            let mut handles = Vec::new();
            for i in 0..count {
                let (body, _) = world.insert(
                    RigidBodyBuilder::dynamic().translation(Vector::new(0.0, 0.5 + i as f32 * 1.005, 0.0)),
                    ColliderBuilder::cuboid(0.5, 0.5, 0.5).friction(0.7),
                );
                handles.push(body);
            }
            for _ in 0..1200 { world.step(); }
            for (i, handle) in handles.into_iter().enumerate() {
                let body = &world.bodies[handle];
                let p = body.translation();
                assert!(p.x.abs() < 0.05 && p.z.abs() < 0.05, "stack {count}, body {i}: {p:?}");
                assert!((p.y - (0.5 + i as f32)).abs() < 0.1, "stack {count}, body {i}: {p:?}");
                assert!(body.is_sleeping(), "stack {count}, body {i} did not sleep");
            }
        }
    }
}
