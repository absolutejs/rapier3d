use rapier3d::prelude::*;
type V = [f64; 3];
fn cross(a: V, b: V) -> V {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}
fn norm(v: V) -> f64 {
    v.iter().map(|x| x * x).sum::<f64>().sqrt()
}
fn rotate(mut q: [f64; 4], v: V) -> V {
    let n = q.iter().map(|x| x * x).sum::<f64>().sqrt();
    for x in &mut q {
        *x /= n;
    }
    let u = [q[0], q[1], q[2]];
    let t = cross(u, v).map(|x| 2. * x);
    let k = cross(u, t);
    core::array::from_fn(|i| v[i] + q[3] * t[i] + k[i])
}
fn quantities(rb: &RigidBody) -> (f64, V) {
    let m = &rb.mass_properties().local_mprops;
    let q = (*rb.rotation() * m.principal_inertia_local_frame)
        .to_array()
        .map(|x| x as f64);
    let w = rb.angvel().to_array().map(|x| x as f64);
    let local = rotate([-q[0], -q[1], -q[2], q[3]], w);
    let p = m.principal_inertia().to_array().map(|x| x as f64);
    let j = core::array::from_fn(|i| p[i] * local[i]);
    (
        0.5 * (0..3).map(|i| j[i] * local[i]).sum::<f64>(),
        rotate(q, j),
    )
}
fn counts(world: &PhysicsWorld) -> [usize; 4] {
    #[cfg(feature = "candidate")]
    {
        world.physics_pipeline.counters.solver.midpoint_counts
    }
    #[cfg(not(feature = "candidate"))]
    {
        let _ = world;
        [0; 4]
    }
}
#[test]
fn actual_engine_free_rotation_matrix() {
    let mut maximum_e = 0.0_f64;
    let mut maximum_l = 0.0_f64;
    let mut cases = 0;
    let mut totals = [0usize; 4];
    for moments in [[2., 3., 4.], [0.005, 1., 1.], [1., 1., 2.], [1., 1., 1.]] {
        for scale in [1e-10, 1., 1e10] {
            for hz in [60, 240] {
                for substeps in [1, 4] {
                    for tilted in [false, true] {
                        let mut world = PhysicsWorld::new();
                        world.gravity = Vector::ZERO;
                        world.integration_parameters.dt = 1.0 / hz as f32;
                        world.integration_parameters.num_solver_iterations = substeps;
                        world.physics_pipeline.counters.enable();
                        let frame = if tilted {
                            Rotation::from_scaled_axis(Vector::new(0.2, -0.3, 0.4))
                        } else {
                            Rotation::IDENTITY
                        };
                        let props = MassProperties::with_principal_inertia_frame(
                            Vector::ZERO,
                            1.,
                            Vector::from_array(moments.map(|i| (i * scale) as f32)),
                            frame,
                        );
                        let mut body = RigidBodyBuilder::dynamic()
                            .can_sleep(false)
                            .additional_mass_properties(props)
                            .rotation(Vector::new(0.3, 0.1, -0.2))
                            .build();
                        body.enable_gyroscopic_forces(true);
                        let handle = world.bodies.insert(body);
                        world.step(); // Initialize actual native mass properties before measurement.
                        world.bodies[handle].set_angvel(Vector::new(2., -3., 4.), true);
                        let (e0, l0) = quantities(&world.bodies[handle]);
                        let mut max_e = 0.0_f64;
                        let mut max_l = 0.0_f64;
                        let mut observed = [0usize; 4];
                        for _ in 0..hz {
                            world.step();
                            let (e, l) = quantities(&world.bodies[handle]);
                            max_e = max_e.max((e / e0 - 1.).abs());
                            max_l =
                                max_l.max(norm(core::array::from_fn(|i| l[i] - l0[i])) / norm(l0));
                            for (sum, count) in observed.iter_mut().zip(counts(&world)) {
                                *sum += count;
                            }
                        }
                        println!("FREE case={cases} scale={scale:e} hz={hz} substeps={substeps} tilted={tilted} energy={max_e:e} momentum={max_l:e} counts={observed:?}");
                        #[cfg(feature = "candidate")]
                        {
                            assert_eq!(observed[0], hz * substeps);
                            assert_eq!(observed[1..], [0, 0, 0]);
                            assert!(max_e < 1e-4 && max_l < 1e-4);
                        }
                        maximum_e = maximum_e.max(max_e);
                        maximum_l = maximum_l.max(max_l);
                        for (sum, count) in totals.iter_mut().zip(observed) {
                            *sum += count;
                        }
                        cases += 1;
                    }
                }
            }
        }
    }
    println!(
        "FREE_SUMMARY cases={cases} energy={maximum_e:e} momentum={maximum_l:e} counts={totals:?}"
    );
    assert_eq!(cases, 96);
}

#[test]
fn excluded_domains_and_rejected_inputs_remain_observable() {
    for mode in [
        "gyro-off",
        "damping",
        "torque",
        "locked",
        "fast",
        "kinematic",
        "contact",
        "joint",
        "multibody",
        "nonphysical",
        "speed-cap",
    ] {
        let mut world = PhysicsWorld::new();
        world.gravity = Vector::ZERO;
        world.integration_parameters.dt = 1.0 / 60.0;
        world.integration_parameters.num_solver_iterations = 4;
        world.physics_pipeline.counters.enable();
        let moments = if mode == "nonphysical" {
            Vector::new(1., 1.0001, 0.000001)
        } else {
            Vector::new(2., 3., 4.)
        };
        let props = MassProperties::new(Vector::ZERO, 1., moments);
        let mut builder = if mode == "kinematic" {
            RigidBodyBuilder::kinematic_velocity_based()
        } else {
            RigidBodyBuilder::dynamic()
        };
        builder = builder
            .additional_mass_properties(props)
            .can_sleep(false)
            .angvel(Vector::new(2., -3., 4.));
        if mode == "gyro-off" {
            builder = builder.gyroscopic_forces_enabled(false);
        }
        if mode == "damping" {
            builder = builder.angular_damping(0.1);
        }
        if mode == "locked" {
            builder = builder.locked_axes(LockedAxes::ROTATION_LOCKED_X);
        }
        if mode == "fast" {
            builder = builder.allow_fast_rotation(true);
        }
        if mode == "speed-cap" {
            builder = builder.angvel(Vector::new(200., -300., 400.));
        }
        let body = world.bodies.insert(builder.build());
        if mode == "torque" {
            world.bodies[body].add_torque(Vector::new(1., 2., 3.), true);
        }
        if mode == "contact" {
            world.colliders.insert_with_parent(
                ColliderBuilder::ball(1.).density(0.).build(),
                body,
                &mut world.bodies,
            );
            world.colliders.insert(
                ColliderBuilder::cuboid(5., 0.1, 5.)
                    .translation(Vector::new(0., -1., 0.))
                    .build(),
            );
        }
        if mode == "joint" || mode == "multibody" {
            let anchor = world.bodies.insert(RigidBodyBuilder::fixed().build());
            if mode == "joint" {
                world
                    .impulse_joints
                    .insert(anchor, body, FixedJointBuilder::new(), true);
            } else {
                world
                    .multibody_joints
                    .insert(anchor, body, FixedJointBuilder::new(), true);
            }
        }
        // Contact/first cap decision are tested on their first step; other modes
        // exercise repeated slot initialization and leave a trace for exact controls.
        let steps = if mode == "contact" || mode == "speed-cap" {
            1
        } else {
            60
        };
        for step in 0..steps {
            world.step();
            let c = counts(&world);
            #[cfg(feature = "candidate")]
            {
                if mode == "nonphysical" {
                    assert_eq!(c, [0, 1, 0, 0]);
                } else if mode == "speed-cap" {
                    assert!(c[2] > 0);
                } else {
                    assert_eq!(c, [0; 4], "mode={mode} step={step}");
                }
                if mode == "contact" {
                    assert!(world.physics_pipeline.counters.solver.ncontacts > 0);
                }
            }
            let rb = &world.bodies[body];
            let bits: Vec<u32> = rb
                .translation()
                .to_array()
                .into_iter()
                .chain(rb.rotation().to_array())
                .chain(rb.linvel().to_array())
                .chain(rb.angvel().to_array())
                .map(|x| x.to_bits())
                .collect();
            println!("CONTROL mode={mode} step={step} bits={bits:?}");
        }
    }
}

#[test]
#[cfg(feature = "candidate")]
fn observations_do_not_change_motion_and_slots_reset_between_islands() {
    fn make(profile: bool) -> (PhysicsWorld, Vec<RigidBodyHandle>) {
        let mut world = PhysicsWorld::new();
        world.gravity = Vector::ZERO;
        world.integration_parameters.dt = 1.0 / 120.0;
        world.integration_parameters.num_solver_iterations = 4;
        if profile {
            world.physics_pipeline.counters.enable();
        } else {
            world.physics_pipeline.counters.disable();
        }
        #[cfg(feature = "parallel")]
        world.configure_thread_pool(2).unwrap();
        let mut handles = Vec::new();
        for i in 0..64 {
            let mut rb = RigidBodyBuilder::dynamic()
                .can_sleep(false)
                .translation(Vector::new(i as f32 * 10., 0., 0.))
                .additional_mass_properties(MassProperties::new(
                    Vector::ZERO,
                    1.,
                    Vector::new(2., 3., 4.),
                ))
                .angvel(Vector::new(2., -3., 4.))
                .build();
            if i % 2 == 1 {
                rb.set_angular_damping(0.1);
            }
            handles.push(world.bodies.insert(rb));
        }
        (world, handles)
    }
    let (mut tracked, handles) = make(true);
    let (mut quiet, other) = make(false);
    for step in 0..120 {
        // Re-enter the excluded domain and come back: stale eligibility and
        // pending attitudes must never leak between steps or solver slots.
        let damping = if step % 3 == 0 { 0.1 } else { 0.0 };
        for i in (0..64).step_by(2) {
            tracked.bodies[handles[i]].set_angular_damping(damping);
            quiet.bodies[other[i]].set_angular_damping(damping);
        }
        tracked.step();
        quiet.step();
        let expected = if damping == 0.0 { 32 * 4 } else { 0 };
        assert_eq!(counts(&tracked), [expected, 0, 0, 0]);
        assert_eq!(counts(&quiet), [0; 4]);
        assert!(
            tracked
                .physics_pipeline
                .counters
                .solver
                .midpoint_max_iterations
                <= 4
        );
        assert!(
            tracked
                .physics_pipeline
                .counters
                .solver
                .midpoint_max_residual
                < 1e-10
        );
        for (a, b) in handles.iter().zip(&other) {
            let a = &tracked.bodies[*a];
            let b = &quiet.bodies[*b];
            assert_eq!(a.position(), b.position(), "step={step}");
            assert_eq!(a.linvel(), b.linvel());
            assert_eq!(a.angvel(), b.angvel());
        }
    }
    println!(
        "OBSERVATION_PARITY checked_body_states=7680 islands=64 steps=120 profiler_on_off=exact"
    );
}

#[test]
fn offset_mass_center_and_gravity_keep_linear_and_angular_updates_consistent() {
    for substeps in [1, 4] {
        let mut world = PhysicsWorld::new();
        world.gravity = Vector::new(0., -9.81, 0.);
        world.integration_parameters.dt = 1.0 / 120.0;
        world.integration_parameters.num_solver_iterations = substeps;
        world.physics_pipeline.counters.enable();
        let props = MassProperties::with_principal_inertia_frame(
            Vector::new(0.3, -0.2, 0.1),
            1.,
            Vector::new(2., 3., 4.),
            Rotation::from_scaled_axis(Vector::new(0.2, -0.3, 0.4)),
        );
        let body = world.bodies.insert(
            RigidBodyBuilder::dynamic()
                .can_sleep(false)
                .additional_mass_properties(props)
                .rotation(Vector::new(0.3, 0.1, -0.2))
                .build(),
        );
        world.step();
        world.bodies[body].set_angvel(Vector::new(2., -3., 4.), true);
        world.bodies[body].set_linvel(Vector::new(0.2, -0.3, 0.4), true);
        let (e0, l0) = quantities(&world.bodies[body]);
        let mut expected = world.bodies[body].center_of_mass();
        let mut velocity = world.bodies[body].linvel();
        let dt = world.integration_parameters.dt / substeps as f32;
        let mut max_com = 0.0_f32;
        let mut max_e = 0.0_f64;
        let mut max_l = 0.0_f64;
        for _ in 0..120 {
            for _ in 0..substeps {
                velocity += world.gravity * dt;
                expected += velocity * dt;
            }
            world.step();
            let rb = &world.bodies[body];
            max_com = max_com.max((rb.center_of_mass() - expected).length());
            let (e, l) = quantities(rb);
            max_e = max_e.max((e / e0 - 1.).abs());
            max_l = max_l.max(norm(core::array::from_fn(|i| l[i] - l0[i])) / norm(l0));
            assert_eq!(rb.linvel(), velocity);
            #[cfg(feature = "candidate")]
            {
                assert_eq!(counts(&world), [substeps, 0, 0, 0]);
            }
        }
        println!("OFFSET_COM substeps={substeps} position_error={max_com:e} relative_energy={max_e:e} relative_momentum={max_l:e}");
        assert!(max_com < 1e-4);
        #[cfg(feature = "candidate")]
        {
            assert!(max_e < 1e-4 && max_l < 1e-4);
        }
    }
}

#[test]
fn actual_engine_attitude_converges_to_independent_rk4_reference() {
    let mut cases = 0;
    let mut max_angle = 0.0_f64;
    for line in include_str!("../../rigid-midpoint-native/rotation-fixtures.csv").lines() {
        let v: Vec<f64> = line.split(',').map(|x| x.parse().unwrap()).collect();
        let expected = [v[6], v[7], v[8], v[9]];
        let mut errors = Vec::new();
        for hz in [60, 120, 240] {
            let mut world = PhysicsWorld::new();
            world.gravity = Vector::ZERO;
            world.integration_parameters.dt = 1.0 / hz as f32;
            world.integration_parameters.num_solver_iterations = 1;
            let props = MassProperties::new(
                Vector::ZERO,
                1.,
                Vector::new(v[0] as f32, v[1] as f32, v[2] as f32),
            );
            let body = world.bodies.insert(
                RigidBodyBuilder::dynamic()
                    .can_sleep(false)
                    .additional_mass_properties(props)
                    .build(),
            );
            world.step();
            world.bodies[body].set_angvel(Vector::new(v[3] as f32, v[4] as f32, v[5] as f32), true);
            for _ in 0..hz {
                world.step();
            }
            let mut q = world.bodies[body].rotation().to_array().map(|x| x as f64);
            let length = q.iter().map(|x| x * x).sum::<f64>().sqrt();
            for x in &mut q {
                *x /= length;
            }
            let a = [q[0], q[1], q[2]];
            let b = [-expected[0], -expected[1], -expected[2]];
            let k = cross(a, b);
            let vector = core::array::from_fn(|i| q[3] * b[i] + expected[3] * a[i] + k[i]);
            let scalar = q[3] * expected[3] - (0..3).map(|i| a[i] * b[i]).sum::<f64>();
            let angle = 2.0 * norm(vector).atan2(scalar.abs());
            errors.push(angle);
            max_angle = max_angle.max(angle);
        }
        println!("NATIVE_TRAJECTORY case={cases} angles={errors:?}");
        #[cfg(feature = "candidate")]
        for pair in errors.windows(2) {
            assert!(
                (3.4..4.6).contains(&(pair[0] / pair[1])),
                "case={cases} errors={errors:?}"
            );
        }
        cases += 1;
    }
    assert_eq!(cases, 12);
    println!("NATIVE_TRAJECTORY_SUMMARY cases={cases} maximum_angle={max_angle:e}");
}
