//! Native reduction of the real generated-terrain rejection. No production policy changes.
use rapier3d::{dynamics::PendingIslandEvents, prelude::*};
use serde_json::json;
use std::{fs, path::Path};
fn restore(bytes: &[u8]) -> PhysicsWorld {
    assert_eq!(&bytes[..12], b"ABSJS3DS\x01\x00\x00\x00");
    let (mut w, pending): (PhysicsWorld, PendingIslandEvents) = bincode::deserialize(&bytes[12..]).unwrap();
    pending.restore(&mut w.impulse_joints, &mut w.multibody_joints, &mut w.soft_bodies);
    w
}
fn clearance(w: &PhysicsWorld) -> f32 {
    let ground = w.colliders.iter().find_map(|(_, c)| c.shape().as_trimesh()).unwrap();
    let points = ground.vertices();
    assert_eq!(points.len(), 33 * 33);
    let mut minimum = f32::INFINITY;
    for (_, c) in w.colliders.iter() {
        let Some(parent) = c.parent() else { continue; };
        let pose = w.bodies[parent].position() * c.position_wrt_parent().unwrap();
        let hull = c.shape().as_convex_polyhedron().expect("actual convex proxy");
        for p in hull.points() {
            let p = pose * *p;
            let u = (p.x + 3200.0) / 200.0;
            let v = (p.z + 3200.0) / 200.0;
            assert!((0.0..=32.0).contains(&u) && (0.0..=32.0).contains(&v));
            let col = (u.floor() as usize).min(31);
            let row = (v.floor() as usize).min(31);
            let (fx, fz) = (u - col as f32, v - row as f32);
            let a = row * 33 + col;
            let h = |i: usize| points[i].y;
            let floor = if fx + fz <= 1.0 {h(a)*(1.0-fx-fz)+h(a+1)*fx+h(a+33)*fz}
                else {h(a+1)*(1.0-fz)+h(a+33)*(1.0-fx)+h(a+34)*(fx+fz-1.0)};
            minimum = minimum.min((p.y-floor)/100.0);
        }
    }
    minimum
}
fn main() {
    let args: Vec<_> = std::env::args().collect();
    assert_eq!(args.len(), 3);
    let root = Path::new(&args[1]); let mut rows = Vec::new();
    for hz in [480, 960, 1920] {
        let bytes = fs::read(root.join(format!("terrain-0-{hz}-initial.bin"))).unwrap();
        for policy in ["unchanged", "recycling-off", "clustering-off", "iterations-32"] {
            let mut w = restore(&bytes);
            match policy {
                "recycling-off" => w.integration_parameters.contact_recycling = false,
                "clustering-off" => w.integration_parameters.contact_clustering = false,
                "iterations-32" => w.integration_parameters.num_solver_iterations = 32,
                _ => {}
            }
            let mut min = clearance(&w); assert!(min > 1.0, "initial world must be airborne: {min}"); let mut steps = 0; let mut sleeping = false;
            for step in 1..=hz*20 {
                w.step(); steps = step;
                sleeping = w.bodies.iter().all(|(_, b)| !b.is_dynamic() || b.is_sleeping());
                if step % (hz/60) == 0 || sleeping { min = min.min(clearance(&w)); }
                if min < -0.02 || sleeping { break; }
            }
            rows.push(json!({"hz":hz,"policy":policy,"minimumClearanceM":min,"steps":steps,"sleeping":sleeping,"clearanceAccepted":min >= -0.02}));
        }
    }
    fs::write(&args[2],serde_json::to_string_pretty(&json!({"scope":"Native convex vertex clearance sampled at game cadence; does not replace all game gates or claim cross-backend identity","rows":rows})).unwrap()+"\n").unwrap();
}
