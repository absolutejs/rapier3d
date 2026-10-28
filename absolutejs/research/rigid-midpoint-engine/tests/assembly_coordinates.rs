//! Coordinate-origin invariance of physically identical fixed assemblies.
//! This is an observation harness, not an assertion that baseline drift is acceptable.
use rapier3d::prelude::*;

fn fixture(offset: Vector, hz: usize) -> (PhysicsWorld, [RigidBodyHandle; 2]) {
    fixture_config(offset, hz, 1, 1.0, false, false)
}
fn fixture_config(
    offset: Vector,
    hz: usize,
    substeps: usize,
    scale: f32,
    tilted: bool,
    gravity: bool,
) -> (PhysicsWorld, [RigidBodyHandle; 2]) {
    fixture_joint(offset, hz, substeps, scale, tilted, gravity, "fixed")
}
fn fixture_joint(
    offset: Vector,
    hz: usize,
    substeps: usize,
    scale: f32,
    tilted: bool,
    gravity: bool,
    kind: &str,
) -> (PhysicsWorld, [RigidBodyHandle; 2]) {
    let mut world = PhysicsWorld::new();
    world.gravity = if gravity {
        Vector::new(0.0, -9.81 * scale, 0.0)
    } else {
        Vector::ZERO
    };
    world.integration_parameters.dt = 1.0 / hz as f32;
    world.integration_parameters.num_solver_iterations = substeps;
    let frame = if tilted {
        Vector::new(0.4, -0.2, 0.7)
    } else {
        Vector::ZERO
    };
    let rotation = Rotation::from_scaled_axis(frame);
    let offset = offset * scale;
    let center = Vector::new(-0.7, 0.2, -0.1) * scale;
    let child_center = Vector::new(0.9, -0.3, 0.4) * scale;
    let root = world.bodies.insert(
        RigidBodyBuilder::dynamic()
            .can_sleep(false)
            .rotation(frame)
            .translation(rotation * (center - offset))
            .additional_mass_properties(MassProperties::new(
                offset,
                2.0,
                Vector::splat(0.4 * scale * scale),
            )),
    );
    let child = world.bodies.insert(
        RigidBodyBuilder::dynamic()
            .can_sleep(false)
            .rotation(frame)
            .translation(rotation * child_center)
            .additional_mass_properties(MassProperties::new(
                Vector::ZERO,
                1.0,
                Vector::splat(0.2 * scale * scale),
            )),
    );
    let anchor = child_center - center + offset;
    let data: GenericJoint = match kind {
        "fixed" => FixedJointBuilder::new()
            .local_anchor1(anchor)
            .build()
            .into(),
        "revolute" => RevoluteJointBuilder::new(Vector::Y)
            .local_anchor1(anchor)
            .build()
            .into(),
        "prismatic" => PrismaticJointBuilder::new(Vector::Y)
            .local_anchor1(anchor)
            .build()
            .into(),
        _ => panic!("unknown joint"),
    };
    let joint = world
        .multibody_joints
        .insert(root, child, data, true)
        .unwrap();
    world.step();
    let (mb, _) = world.multibody_joints.get_mut(joint).unwrap();
    mb.damping_mut().fill(0.0);
    mb.generalized_velocity_mut().as_mut_slice()[..6].copy_from_slice(&[
        0.3 * scale,
        -0.2 * scale,
        0.1 * scale,
        1.2,
        -0.7,
        0.9,
    ]);
    if kind != "fixed" {
        mb.generalized_velocity_mut()[6] = 0.35;
    }
    // Generalized state is authoritative; body descriptor velocities are not used.
    (world, [root, child])
}
fn com(world: &PhysicsWorld, h: RigidBodyHandle) -> Vector {
    let rb = &world.bodies[h];
    rb.position() * rb.mass_properties().local_mprops.local_com
}
#[test]
fn record_root_origin_covariance() {
    for hz in [60, 120, 240] {
        for offset in [Vector::new(0.5, -0.4, 0.3), Vector::new(-1.0, 0.2, 0.6)] {
            let (mut base, a) = fixture(Vector::ZERO, hz);
            let (mut shifted, b) = fixture(offset, hz);
            for i in 0..2 {
                assert!((com(&base, a[i]) - com(&shifted, b[i])).length() < 2e-6);
                assert!((base.bodies[a[i]].mass() - shifted.bodies[b[i]].mass()).abs() < 1e-6);
            }
            let mut maximum = 0.0_f32;
            let mut maximum_angular = 0.0_f32;
            for step in 0..hz {
                base.step();
                shifted.step();
                let error = (com(&base, a[0]) - com(&shifted, b[0])).length();
                let angular = (base.bodies[a[0]].angvel() - shifted.bodies[b[0]].angvel()).length();
                assert!(error.is_finite() && angular.is_finite());
                maximum = maximum.max(error);
                maximum_angular = maximum_angular.max(angular);
                if step == 0 {
                    println!("ORIGIN_FIRST hz={hz} offset={offset:?} com_error={error:e} angular_error={angular:e}");
                }
            }
            println!("ORIGIN_SUMMARY hz={hz} offset={offset:?} com_error={maximum:e} angular_error={maximum_angular:e}");
        }
    }
}

#[test]
fn root_origin_invariance_matrix() {
    let mut cases = 0;
    let mut maximum_position = 0.0_f32;
    let mut maximum_velocity = 0.0_f32;
    for hz in [60, 240] {
        for substeps in [1, 4] {
            for scale in [0.01, 1.0, 100.0] {
                for tilted in [false, true] {
                    for gravity in [false, true] {
                        let (mut base, a) =
                            fixture_config(Vector::ZERO, hz, substeps, scale, tilted, gravity);
                        let (mut shifted, b) = fixture_config(
                            Vector::new(-1.0, 0.2, 0.6),
                            hz,
                            substeps,
                            scale,
                            tilted,
                            gravity,
                        );
                        let mut position = 0.0_f32;
                        let mut velocity = 0.0_f32;
                        for _ in 0..hz {
                            base.step();
                            shifted.step();
                            for i in 0..2 {
                                position = position
                                    .max((com(&base, a[i]) - com(&shifted, b[i])).length() / scale);
                                velocity = velocity.max(
                                    (base.bodies[a[i]].linvel() - shifted.bodies[b[i]].linvel())
                                        .length()
                                        / scale,
                                );
                            }
                        }
                        println!("ORIGIN_MATRIX hz={hz} substeps={substeps} scale={scale} tilted={tilted} gravity={gravity} position={position:e} velocity={velocity:e}");
                        assert!(
                            position < 5e-5 && velocity < 5e-5,
                            "coordinate invariance violated"
                        );
                        maximum_position = maximum_position.max(position);
                        maximum_velocity = maximum_velocity.max(velocity);
                        cases += 1;
                    }
                }
            }
        }
    }
    assert_eq!(cases, 48);
    println!("ORIGIN_MATRIX_SUMMARY cases={cases} position={maximum_position:e} velocity={maximum_velocity:e}");
}

#[test]
fn movable_joint_root_origin_invariance() {
    let mut cases = 0;
    let mut maximum = 0.0_f32;
    for kind in ["revolute", "prismatic"] {
        for hz in [60, 240] {
            for substeps in [1, 4] {
                for gravity in [false, true] {
                    let (mut base, a) =
                        fixture_joint(Vector::ZERO, hz, substeps, 1.0, true, gravity, kind);
                    let (mut shifted, b) = fixture_joint(
                        Vector::new(-1.0, 0.2, 0.6),
                        hz,
                        substeps,
                        1.0,
                        true,
                        gravity,
                        kind,
                    );
                    let mut error = 0.0_f32;
                    for _ in 0..hz {
                        base.step();
                        shifted.step();
                        for i in 0..2 {
                            error = error.max((com(&base, a[i]) - com(&shifted, b[i])).length());
                            error = error.max(
                                (base.bodies[a[i]].linvel() - shifted.bodies[b[i]].linvel())
                                    .length(),
                            );
                            error = error.max(
                                (base.bodies[a[i]].angvel() - shifted.bodies[b[i]].angvel())
                                    .length(),
                            );
                        }
                    }
                    println!("MOVABLE_ORIGIN kind={kind} hz={hz} substeps={substeps} gravity={gravity} maximum={error:e}");
                    assert!(error < 5e-5);
                    maximum = maximum.max(error);
                    cases += 1;
                }
            }
        }
    }
    assert_eq!(cases, 16);
    println!("MOVABLE_ORIGIN_SUMMARY cases={cases} maximum={maximum:e}");
}
