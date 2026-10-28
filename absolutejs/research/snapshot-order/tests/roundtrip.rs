use rapier3d::{dynamics::PendingIslandEvents, prelude::*};

fn snapshot(world: &PhysicsWorld) -> Vec<u8> {
    let pending = PendingIslandEvents::capture(
        &world.impulse_joints,
        &world.multibody_joints,
        &world.soft_bodies,
    );
    bincode::serialize(&(world, pending)).unwrap()
}

fn restore(bytes: &[u8]) -> PhysicsWorld {
    let (mut world, pending): (PhysicsWorld, PendingIslandEvents) =
        bincode::deserialize(bytes).unwrap();
    pending.restore(
        &mut world.impulse_joints,
        &mut world.multibody_joints,
        &mut world.soft_bodies,
    );
    world
}

#[test]
fn reused_body_slots_keep_generational_wake_membership() {
    for impulse in [false, true] {
        let mut world = PhysicsWorld::new();
        world.gravity = Vector::ZERO;
        let desc = |x| RigidBodyBuilder::dynamic().translation(Vector::new(x, 0.0, 0.0))
            .additional_mass_properties(MassProperties::new(Vector::ZERO, 1.0, Vector::splat(0.2)));
        let old = world.bodies.insert(desc(0.0));
        let child = world.bodies.insert(desc(1.0));
        let joint = || FixedJointBuilder::new().local_anchor1(Vector::X);
        if impulse {
            let h = world.impulse_joints.insert(old, child, joint(), true);
            world.step(); world.impulse_joints.remove(h, true);
        } else {
            let h = world.multibody_joints.insert(old, child, joint(), true).unwrap();
            world.step(); world.multibody_joints.remove(h, true);
        }
        world.remove_body(old).unwrap();
        let replacement = world.bodies.insert(desc(0.0));
        assert_eq!(old.into_raw_parts().0, replacement.into_raw_parts().0);
        assert_ne!(old.into_raw_parts().1, replacement.into_raw_parts().1);
        if impulse { world.impulse_joints.insert(replacement, child, joint(), true); }
        else { world.multibody_joints.insert(replacement, child, joint(), true).unwrap(); }
        let before = snapshot(&world);
        let mut restored = restore(&before);
        assert_eq!(before, snapshot(&restored));
        for _ in 0..8 {
            world.step(); restored.step();
            assert!(snapshot(&world) == snapshot(&restored));
            assert!(world.bodies.get(old).is_none());
            assert!(world.bodies.get(replacement).is_some());
        }
    }
}

#[test]
fn fresh_and_sleeping_joint_wakes_replay_exactly() {
    for impulse in [false, true] {
        for count in [1, 8, 32, 64] {
            for sleeping in [false, true] {
                let mut world = PhysicsWorld::new();
                world.gravity = Vector::ZERO;
                #[cfg(feature = "parallel")]
                world.configure_thread_pool(2).unwrap();
                let mut bodies = Vec::new();
                let mut joints = Vec::new();
                let mut impulse_joints = Vec::new();
                for i in 0..count {
                    let pair: Vec<_> = (0..2)
                        .map(|j| {
                            world.bodies.insert(
                                RigidBodyBuilder::dynamic()
                                    .translation(Vector::new((i * 4 + j) as f32, 0.0, 0.0))
                                    .additional_mass_properties(MassProperties::new(
                                        Vector::ZERO,
                                        1.0,
                                        Vector::splat(0.2),
                                    )),
                            )
                        })
                        .collect();
                    let data = FixedJointBuilder::new().local_anchor1(Vector::X);
                    if impulse {
                        impulse_joints
                            .push(world.impulse_joints.insert(pair[0], pair[1], data, true));
                    } else {
                        joints.push(
                            world
                                .multibody_joints
                                .insert(pair[0], pair[1], data, true)
                                .unwrap(),
                        );
                    }
                    bodies.extend(pair);
                }
                if sleeping {
                    for _ in 0..180 {
                        world.step();
                    }
                    assert!(bodies.iter().all(|h| world.bodies[*h].is_sleeping()));
                    for joint in joints {
                        world.multibody_joints.remove(joint, true);
                    }
                    for joint in impulse_joints {
                        world.impulse_joints.remove(joint, true);
                    }
                    for (i, handle) in bodies.iter().enumerate() {
                        world.bodies[*handle]
                            .set_linvel(Vector::new(i as f32 * 0.001, -0.2, 0.1), false);
                    }
                }
                let bytes = snapshot(&world);
                let mut restored = restore(&bytes);
                #[cfg(feature = "parallel")]
                restored.configure_thread_pool(2).unwrap();
                assert_eq!(
                    bytes,
                    snapshot(&restored),
                    "roundtrip impulse={impulse} count={count} sleeping={sleeping}"
                );
                for step in 0..8 {
                    world.step();
                    restored.step();
                    assert!(
                        snapshot(&world) == snapshot(&restored),
                        "replay impulse={impulse} count={count} sleeping={sleeping} step={step}"
                    );
                }
                println!(
                    "ORDER_REPLAY impulse={impulse} count={count} sleeping={sleeping} steps=8"
                );
            }
        }
    }
}
