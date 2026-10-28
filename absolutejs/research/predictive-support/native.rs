use rapier3d::{dynamics::PendingIslandEvents, prelude::*};
fn fixture(
    scale: f32,
    speed: f32,
    reverse: bool,
) -> (PhysicsWorld, ColliderHandle, ColliderHandle) {
    let mut w = PhysicsWorld::new();
    w.gravity = Vector::ZERO;
    w.integration_parameters.dt = 0.1;
    w.integration_parameters.num_solver_iterations = 8;
    w.integration_parameters.length_unit = scale;
    #[cfg(feature = "parallel")]
    w.configure_thread_pool(2).unwrap();
    let floor = || {
        ColliderBuilder::trimesh(
            vec![
                Vector::new(-5.0, 0.0, -5.0) * scale,
                Vector::new(5.0, 0.0, -5.0) * scale,
                Vector::new(-5.0, 0.0, 5.0) * scale,
                Vector::new(5.0, 0.0, 5.0) * scale,
            ],
            vec![[0, 2, 1], [1, 2, 3]],
        )
        .unwrap()
        .friction(0.0)
        .restitution(0.0)
    };
    let make_box = |w: &mut PhysicsWorld| {
        let angle = 0.07_f32;
        let center = (0.01 + angle.sin() + 0.05 * angle.cos()) * scale;
        w.insert(
            RigidBodyBuilder::dynamic()
                .translation(Vector::new(0.0, center, 0.0))
                .rotation(Vector::new(0.0, 0.0, angle))
                .linvel(Vector::new(0.0, speed * scale, 0.0)),
            ColliderBuilder::cuboid(scale, 0.05 * scale, scale)
                .friction(0.0)
                .restitution(0.0),
        )
        .1
    };
    let (floor, wood) = if reverse {
        let b = make_box(&mut w);
        (w.colliders.insert(floor()), b)
    } else {
        let f = w.colliders.insert(floor());
        (f, make_box(&mut w))
    };
    (w, floor, wood)
}
fn supports(w: &PhysicsWorld, floor: ColliderHandle, wood: ColliderHandle) -> Vec<Vector> {
    let pair = w.narrow_phase.contact_pair(floor, wood).unwrap();
    let rigid = pair.rigid().unwrap();
    assert!(
        rigid
            .manifolds
            .iter()
            .map(|m| m.points.len())
            .sum::<usize>()
            > 4
    );
    rigid
        .solver_manifolds()
        .iter()
        .flat_map(|m| {
            m.data.solver_contacts.iter().map(|p| {
                if pair.collider1 == floor {
                    p.anchor1
                } else {
                    p.anchor2
                }
            })
        })
        .collect()
}
fn checkpoint(w: &PhysicsWorld) -> Vec<u8> {
    let pending =
        PendingIslandEvents::capture(&w.impulse_joints, &w.multibody_joints, &w.soft_bodies);
    bincode::serialize(&(w, pending)).unwrap()
}
fn restore(bytes: &[u8]) -> PhysicsWorld {
    let (mut w, p): (PhysicsWorld, PendingIslandEvents) = bincode::deserialize(bytes).unwrap();
    p.restore(
        &mut w.impulse_joints,
        &mut w.multibody_joints,
        &mut w.soft_bodies,
    );
    #[cfg(feature = "parallel")]
    w.configure_thread_pool(2).unwrap();
    w
}
#[test]
fn predicted_support_spans_scales_and_collider_orders() {
    for scale in [0.01, 1.0, 100.0] {
        for reverse in [false, true] {
            let (mut w, f, b) = fixture(scale, -2.0, reverse);
            w.step();
            let points = supports(&w, f, b);
            assert_eq!(points.len(), 4);
            assert!(points.iter().any(|p| p.x / scale < -0.9));
            assert!(points.iter().any(|p| p.x / scale > 0.9));
            assert!(points.iter().all(|p| p.y.abs() / scale < 1e-4));
        }
    }
}
#[test]
fn nonapproaching_extents_stay_outside_prediction() {
    for speed in [0.0, 2.0] {
        let (mut w, f, b) = fixture(1.0, speed, false);
        w.step();
        let p = supports(&w, f, b);
        assert!(!p.is_empty());
        assert!(p.iter().all(|p| p.x < -0.9));
    }
}
#[test]
fn support_snapshot_replay_is_exact() {
    let (mut w, _, _) = fixture(1.0, -2.0, false);
    let input = checkpoint(&w);
    let mut r = restore(&input);
    assert_eq!(checkpoint(&r), input);
    for _ in 0..8 {
        w.step();
        r.step();
        assert_eq!(checkpoint(&w), checkpoint(&r));
    }
}
