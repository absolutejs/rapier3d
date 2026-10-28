#![cfg(feature = "snapshot")]
use rapier3d::dynamics::PendingIslandEvents;
use rapier3d::prelude::*;

#[test]
fn pending_soft_body_edits_survive_native_checkpoint() {
    for remove in [false, true] {
        let mut world = PhysicsWorld::new();
        world.gravity = Vector::ZERO;
        let handle = world.insert_soft_body(SoftBodyBuilder::new(vec![Vector::ZERO, Vector::X]));
        if remove {
            world.step();
            world.remove_soft_body(handle).unwrap();
        }
        let pending = bincode::serialize(&PendingIslandEvents::capture(
            &world.impulse_joints,
            &world.multibody_joints,
            &world.soft_bodies,
        ))
        .unwrap();
        let mut restored: PhysicsWorld =
            bincode::deserialize(&bincode::serialize(&world).unwrap()).unwrap();
        let decoded: PendingIslandEvents = bincode::deserialize(&pending).unwrap();
        decoded.restore(
            &mut restored.impulse_joints,
            &mut restored.multibody_joints,
            &mut restored.soft_bodies,
        );
        for step in 0..8 {
            world.step();
            restored.step();
            assert_eq!(
                bincode::serialize(&world).unwrap(),
                bincode::serialize(&restored).unwrap(),
                "soft remove={remove} step {step}"
            );
        }
    }
}

#[test]
fn pending_impulse_edits_survive_native_checkpoint() {
    for mode in ["insert", "remove", "disable", "disable-all"] {
        let mut world = PhysicsWorld::new();
        world.gravity = Vector::ZERO;
        let a = world.bodies.insert(
            RigidBodyBuilder::dynamic()
                .additional_mass(1.0)
                .can_sleep(false),
        );
        let b = world.bodies.insert(
            RigidBodyBuilder::dynamic()
                .additional_mass(1.0)
                .can_sleep(false),
        );
        let joint = world
            .impulse_joints
            .insert(a, b, FixedJointBuilder::new(), true);
        world.step();
        match mode {
            "insert" => {
                world
                    .impulse_joints
                    .insert(a, b, FixedJointBuilder::new(), true);
            }
            "remove" => {
                world.impulse_joints.remove(joint, true);
            }
            "disable" => {
                world
                    .impulse_joints
                    .get_mut(joint, true)
                    .unwrap()
                    .data
                    .set_enabled(false);
            }
            "disable-all" => {
                for (_, joint) in world.impulse_joints.iter_mut() {
                    joint.data.set_enabled(false);
                }
            }
            _ => unreachable!(),
        }
        let pending = PendingIslandEvents::capture(
            &world.impulse_joints,
            &world.multibody_joints,
            &world.soft_bodies,
        );
        let encoded_pending = bincode::serialize(&pending).unwrap();
        let encoded_world = bincode::serialize(&world).unwrap();
        let mut restored: PhysicsWorld = bincode::deserialize(&encoded_world).unwrap();
        let decoded: PendingIslandEvents = bincode::deserialize(&encoded_pending).unwrap();
        decoded.restore(
            &mut restored.impulse_joints,
            &mut restored.multibody_joints,
            &mut restored.soft_bodies,
        );
        assert_eq!(
            encoded_pending,
            bincode::serialize(&PendingIslandEvents::capture(
                &restored.impulse_joints,
                &restored.multibody_joints,
                &restored.soft_bodies
            ))
            .unwrap()
        );
        for step in 0..8 {
            world.step();
            restored.step();
            assert_eq!(
                bincode::serialize(&world).unwrap(),
                bincode::serialize(&restored).unwrap(),
                "{mode} step {step}"
            );
        }
    }
}
