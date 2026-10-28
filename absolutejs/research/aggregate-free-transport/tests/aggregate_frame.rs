#[allow(dead_code)]
#[path = "../../../../src/dynamics/rigid_midpoint.rs"]
mod arithmetic_reference;
// Authored-frame aggregation and actual native integration qualification.
use rapier3d::prelude::*;
type V = [f64; 3];
fn cross(a: V, b: V) -> V {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}
fn rotate(q: Rotation, v: V) -> V {
    let mut q = q.to_array().map(|x| x as f64);
    let length = q.iter().map(|x| x * x).sum::<f64>().sqrt();
    for x in &mut q {
        *x /= length;
    }
    let u = [q[0], q[1], q[2]];
    let t = cross(u, v).map(|x| 2.0 * x);
    let c = cross(u, t);
    core::array::from_fn(|i| v[i] + q[3] * t[i] + c[i])
}
fn vec(v: Vector) -> V {
    v.to_array().map(|x| x as f64)
}
fn oracle(items: &[(Pose, MassProperties)]) -> (f64, V, [f64; 9]) {
    let mut rows = Vec::new();
    let mut mass = 0.0;
    let mut first = [0.0; 3];
    for (pose, props) in items {
        let m = props.mass() as f64;
        let c = rotate(pose.rotation, vec(props.local_com));
        let c: V = core::array::from_fn(|i| c[i] + vec(pose.translation)[i]);
        let frame = pose.rotation * props.principal_inertia_local_frame;
        let axes = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]].map(|v| rotate(frame, v));
        let principal = vec(props.principal_inertia());
        let tensor: [f64; 9] = core::array::from_fn(|k| {
            (0..3)
                .map(|i| principal[i] * axes[i][k / 3] * axes[i][k % 3])
                .sum()
        });
        mass += m;
        for i in 0..3 {
            first[i] += m * c[i];
        }
        rows.push((m, c, tensor));
    }
    let center = first.map(|x| x / mass);
    let mut tensor = [0.0; 9];
    for (m, c, j) in rows {
        let d: V = core::array::from_fn(|i| c[i] - center[i]);
        let length = d.iter().map(|x| x * x).sum::<f64>();
        for k in 0..9 {
            tensor[k] +=
                j[k] + m * ((if k / 3 == k % 3 { length } else { 0.0 }) - d[k / 3] * d[k % 3]);
        }
    }
    (mass, center, tensor)
}
fn templates(scale: f32) -> Vec<(Pose, MassProperties)> {
    let positions = [
        Vector::new(-0.6, 0.0, 0.1),
        Vector::new(0.4, 0.3, -0.2),
        Vector::new(0.1, -0.5, 0.7),
    ];
    let rotations = [
        Vector::new(0.1, 0.2, 0.0),
        Vector::new(-0.2, 0.1, 0.4),
        Vector::new(0.3, -0.1, 0.2),
    ];
    [2.0, 3.0, 5.0]
        .into_iter()
        .enumerate()
        .map(|(i, m)| {
            let pose = Pose::from_parts(
                positions[i] * scale,
                Rotation::from_scaled_axis(rotations[i]),
            );
            let props = MassProperties::with_principal_inertia_frame(
                Vector::new(0.07, -0.03, 0.02) * (scale * (i + 1) as f32),
                m,
                Vector::new(0.02, 0.03, 0.04) * (m * scale * scale),
                Rotation::from_scaled_axis(Vector::new(0.2, -0.1, 0.3)),
            );
            (pose, props)
        })
        .collect()
}
fn fixture(
    scale: f32,
    root: usize,
    shift: f32,
    tilted: bool,
) -> (PhysicsWorld, Vec<RigidBodyHandle>, MultibodyJointHandle) {
    fixture_kind(scale, root, shift, tilted, false)
}
fn fixture_kind(
    scale: f32,
    root: usize,
    shift: f32,
    tilted: bool,
    hinge: bool,
) -> (PhysicsWorld, Vec<RigidBodyHandle>, MultibodyJointHandle) {
    let authored = templates(scale);
    let mut world = PhysicsWorld::new();
    #[cfg(feature = "parallel")]
    {
        world.configure_thread_pool(2).unwrap();
        assert_eq!(world.num_threads(), Some(2));
    }
    world.gravity = Vector::ZERO;
    let world_pose = Pose::from_parts(
        Vector::new(shift, -shift, shift),
        if tilted {
            Rotation::from_scaled_axis(Vector::new(0.4, -0.3, 0.7))
        } else {
            Rotation::IDENTITY
        },
    );
    let bodies: Vec<_> = authored
        .iter()
        .map(|(pose, props)| {
            world.bodies.insert(
                RigidBodyBuilder::dynamic()
                    .can_sleep(false)
                    .pose(world_pose * (*pose))
                    .additional_mass_properties(*props),
            )
        })
        .collect();
    let mut handle = None;
    for i in 0..3 {
        if i != root {
            let frame = authored[root].0.inverse() * authored[i].0;
            let data: GenericJoint = if hinge {
                let mut data: GenericJoint = RevoluteJointBuilder::new(Vector::Y).build().into();
                data.local_frame1 = frame;
                data
            } else {
                FixedJointBuilder::new().local_frame1(frame).build().into()
            };
            handle = world
                .multibody_joints
                .insert(bodies[root], bodies[i], data, true);
        }
    }
    world.step();
    (world, bodies, handle.unwrap())
}
fn aggregate(scale: f32, root: usize, shift: f32, tilted: bool) -> (MassProperties, Pose) {
    let authored = templates(scale);
    let (world, _, handle) = fixture(scale, root, shift, tilted);
    let (mb, _) = world.multibody_joints.get(handle).unwrap();
    let mut relative = vec![Pose::IDENTITY; mb.num_links()];
    let mut props = Vec::new();
    for link in mb.links() {
        let i = link.link_id();
        if let Some(parent) = link.parent_id() {
            relative[i] = relative[parent] * link.joint().body_to_parent();
        }
        let local = world.bodies[link.rigid_body_handle()]
            .mass_properties()
            .local_mprops;
        props.push(local.transform_by(&relative[i]));
    }
    (props.into_iter().sum(), authored[root].0)
}
#[test]
fn authored_aggregate_avoids_world_translation_and_orientation_roundtrips() {
    let mut max_tensor = 0.0_f64;
    let mut max_center = 0.0_f64;
    let mut cases = 0;
    for scale in [0.001, 1.0, 1000.0] {
        let (mass, center, tensor) = oracle(&templates(scale));
        let magnitude = tensor.iter().map(|x| x * x).sum::<f64>().sqrt();
        for root in 0..3 {
            let (base, _) = aggregate(scale, root, 0.0, false);
            for shift in [0.0, 1e6] {
                for tilted in [false, true] {
                    let (actual, root_pose) = aggregate(scale, root, shift, tilted);
                    assert_eq!(actual.local_com, base.local_com);
                    assert_eq!(actual.inv_principal_inertia, base.inv_principal_inertia);
                    assert_eq!(
                        actual.principal_inertia_local_frame,
                        base.principal_inertia_local_frame
                    );
                    let (actual_mass, actual_center, actual_tensor) =
                        oracle(&[(root_pose, actual)]);
                    let tensor_error = actual_tensor
                        .iter()
                        .zip(tensor)
                        .map(|(a, b)| (a - b) * (a - b))
                        .sum::<f64>()
                        .sqrt()
                        / magnitude;
                    let center_error = actual_center
                        .iter()
                        .zip(center)
                        .map(|(a, b)| (a - b) * (a - b))
                        .sum::<f64>()
                        .sqrt()
                        / scale as f64;
                    assert!(
                        (actual_mass - mass).abs() < 1e-5
                            && tensor_error < 5e-6
                            && center_error < 5e-6
                    );
                    max_tensor = max_tensor.max(tensor_error);
                    max_center = max_center.max(center_error);
                    cases += 1;
                    println!("AGGREGATE_FRAME root={root} scale={scale} shift={shift} tilted={tilted} tensor={tensor_error:e} center={center_error:e}");
                }
            }
        }
    }
    assert_eq!(cases, 36);
    println!("AGGREGATE_FRAME_SUMMARY cases={cases} relative_tensor={max_tensor:e} scaled_center={max_center:e}");
}

fn norm(v: V) -> f64 {
    v.iter().map(|x| x * x).sum::<f64>().sqrt()
}
fn difference(a: V, b: V) -> V {
    core::array::from_fn(|i| a[i] - b[i])
}
fn center_of(body: &RigidBody) -> V {
    let offset = rotate(
        *body.rotation(),
        vec(body.mass_properties().local_mprops.local_com),
    );
    core::array::from_fn(|i| body.translation()[i] as f64 + offset[i])
}
fn quantities(
    world: &PhysicsWorld,
    bodies: &[RigidBodyHandle],
    initial: Option<(V, V, V)>,
) -> (f64, V, V, V, f64) {
    let mass: f64 = bodies.iter().map(|h| world.bodies[*h].mass() as f64).sum();
    let mut center = [0.0; 3];
    for h in bodies {
        let rb = &world.bodies[*h];
        let c = center_of(rb);
        for i in 0..3 {
            center[i] += rb.mass() as f64 * c[i] / mass;
        }
    }
    let mut momentum = [0.0; 3];
    let mut angular = [0.0; 3];
    let mut energy = 0.0;
    for h in bodies {
        let rb = &world.bodies[*h];
        let m = rb.mass() as f64;
        let c = center_of(rb);
        let (v, w) = if let Some((v, w, root_center)) = initial {
            let shift = cross(w, difference(c, root_center));
            (core::array::from_fn(|i| v[i] + shift[i]), w)
        } else {
            (vec(rb.linvel()), vec(rb.angvel()))
        };
        let (_, _, j) = oracle(&[(*rb.position(), rb.mass_properties().local_mprops)]);
        let spin: V = core::array::from_fn(|i| (0..3).map(|k| j[i * 3 + k] * w[k]).sum());
        let p = v.map(|x| x * m);
        let orbital = cross(difference(c, center), p);
        for i in 0..3 {
            momentum[i] += p[i];
            angular[i] += spin[i] + orbital[i];
            energy += 0.5 * (m * v[i] * v[i] + w[i] * spin[i]);
        }
    }
    (mass, center, momentum, angular, energy)
}
#[test]
fn actual_free_assembly_conservation_matrix() {
    let mut maxima = [0.0_f64; 4];
    let mut cases = 0;
    for scale in [0.01, 1.0, 100.0] {
        for root in 0..3 {
            for hz in [60, 240] {
                for substeps in [1, 4] {
                    let (mut world, bodies, handle) = fixture(scale, root, 0.0, true);
                    world.integration_parameters.dt = 1.0 / hz as f32;
                    world.integration_parameters.num_solver_iterations = substeps;
                    world.physics_pipeline.counters.enable();
                    let center = center_of(&world.bodies[bodies[root]]);
                    let root_v = Vector::new(0.3, -0.2, 0.1) * scale;
                    let omega = Vector::new(2.0, -3.0, 4.0);
                    let (mb, _) = world.multibody_joints.get_mut(handle).unwrap();
                    mb.damping_mut().fill(0.0);
                    mb.generalized_velocity_mut().as_mut_slice()[..3]
                        .copy_from_slice(&root_v.to_array());
                    mb.generalized_velocity_mut().as_mut_slice()[3..6]
                        .copy_from_slice(&omega.to_array());
                    let (mass, c0, p0, l0, e0) =
                        quantities(&world, &bodies, Some((vec(root_v), vec(omega), center)));
                    let mut errors = [0.0_f64; 4];
                    let mut counts = [0usize; 4];
                    for step in 1..=hz {
                        world.step();
                        let (_, c, p, l, e) = quantities(&world, &bodies, None);
                        let expected: V = core::array::from_fn(|i| {
                            c0[i]
                                + p0[i] / mass
                                    * (step as f64 * world.integration_parameters.dt as f64)
                        });
                        let values = [
                            norm(difference(p, p0)) / norm(p0),
                            norm(difference(l, l0)) / norm(l0),
                            (e / e0 - 1.0).abs(),
                            norm(difference(c, expected)) / scale as f64,
                        ];
                        for i in 0..4 {
                            assert!(values[i].is_finite());
                            errors[i] = errors[i].max(values[i]);
                            counts[i] += assembly_counts(&world)[i];
                        }
                    }
                    println!("AGGREGATE_FREE root={root} scale={scale} hz={hz} substeps={substeps} errors={errors:?} counts={counts:?}");
                    #[cfg(feature = "candidate")]
                    {
                        assert_eq!(counts, [hz * substeps, 0, 0, 0]);
                        assert!(errors.iter().all(|x| *x < 1e-4));
                    }
                    for i in 0..4 {
                        maxima[i] = maxima[i].max(errors[i]);
                    }
                    cases += 1;
                }
            }
        }
    }
    assert_eq!(cases, 36);
    println!("AGGREGATE_FREE_SUMMARY cases={cases} errors={maxima:?}");
}

fn assembly_counts(world: &PhysicsWorld) -> [usize; 4] {
    #[cfg(feature = "candidate")]
    {
        world.physics_pipeline.counters.solver.free_assembly_counts
    }
    #[cfg(not(feature = "candidate"))]
    {
        let _ = world;
        [0; 4]
    }
}
#[test]
fn excluded_assembly_paths_preserve_controls() {
    for mode in [
        "damping",
        "body-angular-damping",
        "body-linear-damping",
        "gyro-off",
        "fast",
        "force",
        "torque",
        "differential-gravity",
        "armature",
        "friction",
        "spring",
        "external-joint",
        "contact",
        "locked",
        "hinge",
        "nonphysical",
        "aggregate-overflow",
        "cap",
    ] {
        let root = 1;
        let (mut world, bodies, handle) = fixture_kind(1.0, root, 0.0, true, mode == "hinge");
        world.integration_parameters.dt = 1.0 / 60.0;
        world.integration_parameters.num_solver_iterations = 4;
        world.physics_pipeline.counters.enable();
        let (mb, _) = world.multibody_joints.get_mut(handle).unwrap();
        if mode != "damping" {
            mb.damping_mut().fill(0.0);
        }
        mb.generalized_velocity_mut().as_mut_slice()[..6]
            .copy_from_slice(&[0.3, -0.2, 0.1, 2.0, -3.0, 4.0]);
        match mode {
            "armature" => mb.armature_mut()[0] = 0.1,
            "friction" => mb.frictions_mut()[0] = 0.1,
            "spring" => mb.root_mut().joint.set_spring(0, 0.2, 0.0),
            "cap" => mb.generalized_velocity_mut().as_mut_slice()[3..6]
                .copy_from_slice(&[60.0, 0.0, 0.0]),
            _ => {}
        }
        match mode {
            "body-angular-damping" => world.bodies[bodies[root]].set_angular_damping(0.1),
            "body-linear-damping" => world.bodies[bodies[root]].set_linear_damping(0.1),
            "gyro-off" => world.bodies[bodies[root]].enable_gyroscopic_forces(false),
            "fast" => world.bodies[bodies[root]].set_allow_fast_rotation(true),
            "force" => world.bodies[bodies[root]].add_force(Vector::X, true),
            "torque" => world.bodies[bodies[root]].add_torque(Vector::Y, true),
            "differential-gravity" => {
                world.gravity = Vector::new(0.0, -9.81, 0.0);
                world.bodies[bodies[0]].set_gravity_scale(0.5, true);
            }
            "locked" => world.bodies[bodies[root]].lock_rotations(true, true),
            "external-joint" => {
                let pose = *world.bodies[bodies[root]].position();
                let anchor = world.bodies.insert(RigidBodyBuilder::fixed().pose(pose));
                world
                    .impulse_joints
                    .insert(anchor, bodies[root], FixedJointBuilder::new(), true);
            }
            "contact" => {
                let rb = &world.bodies[bodies[root]];
                let local = rb.mass_properties().local_mprops.local_com;
                let center = Vector::from_array(center_of(rb).map(|x| x as f32));
                world.colliders.insert_with_parent(
                    ColliderBuilder::ball(0.25).translation(local).mass(0.0),
                    bodies[root],
                    &mut world.bodies,
                );
                world
                    .colliders
                    .insert(ColliderBuilder::ball(0.25).translation(center));
            }
            "aggregate-overflow" => {
                for h in &bodies {
                    let rb = &mut world.bodies[*h];
                    let props = MassProperties::new(
                        rb.mass_properties().local_mprops.local_com,
                        2e38,
                        Vector::splat(1e38),
                    );
                    rb.set_additional_mass_properties(props, true);
                }
            }
            "nonphysical" => {
                for h in &bodies {
                    let rb = &mut world.bodies[*h];
                    let props = MassProperties::new(
                        rb.mass_properties().local_mprops.local_com,
                        rb.mass(),
                        Vector::new(1.0, 1.0, 20.0) * rb.mass(),
                    );
                    rb.set_additional_mass_properties(props, true);
                }
            }
            _ => {}
        }
        let steps = if mode == "contact" || mode == "cap" {
            1
        } else {
            24
        };
        for step in 0..steps {
            world.step();
            let counts = assembly_counts(&world);
            #[cfg(feature = "candidate")]
            {
                assert_eq!(counts[0], 0, "unexpected admission: {mode}");
                if mode == "cap" {
                    assert_eq!(counts[2], 1);
                }
                if mode == "nonphysical" {
                    assert_eq!(counts[1], 1);
                }
            }
            let mut bits = Vec::new();
            for h in &bodies {
                let rb = &world.bodies[*h];
                bits.extend(rb.translation().to_array().map(f32::to_bits));
                bits.extend(rb.rotation().to_array().map(f32::to_bits));
                bits.extend(rb.linvel().to_array().map(f32::to_bits));
                bits.extend(rb.angvel().to_array().map(f32::to_bits));
            }
            println!("ASSEMBLY_CONTROL mode={mode} step={step} bits={bits:?}");
            println!("ASSEMBLY_ADMISSION mode={mode} step={step} counts={counts:?}");
        }
    }
}

fn rotation_distance(a: Rotation, b: Rotation) -> f64 {
    let normalize = |q: Rotation| {
        let q = q.to_array().map(|x| x as f64);
        let n = q.iter().map(|x| x * x).sum::<f64>().sqrt();
        q.map(|x| x / n)
    };
    let a = normalize(a);
    let b = normalize(b);
    let minus = (0..4).map(|i| (a[i] - b[i]).powi(2)).sum::<f64>();
    let plus = (0..4).map(|i| (a[i] + b[i]).powi(2)).sum::<f64>();
    4.0 * (0.5 * minus.min(plus).sqrt()).min(1.0).asin()
}
#[test]
fn equivalent_root_choices_preserve_physical_trajectories() {
    for hz in [60, 240] {
        for substeps in [1, 4] {
            let mut scenes = Vec::new();
            for root in 0..3 {
                let (mut world, bodies, handle) = fixture(1.0, root, 0.0, true);
                world.integration_parameters.dt = 1.0 / hz as f32;
                world.integration_parameters.num_solver_iterations = substeps;
                let (_, center, _, _, _) = quantities(&world, &bodies, None);
                let omega = [2.0, -3.0, 4.0];
                let velocity = [0.3, -0.2, 0.1];
                let shift = cross(
                    omega,
                    difference(center_of(&world.bodies[bodies[root]]), center),
                );
                let root_velocity: V = core::array::from_fn(|i| velocity[i] + shift[i]);
                let (mb, _) = world.multibody_joints.get_mut(handle).unwrap();
                mb.damping_mut().fill(0.0);
                mb.generalized_velocity_mut().as_mut_slice()[..3]
                    .copy_from_slice(&root_velocity.map(|x| x as f32));
                mb.generalized_velocity_mut().as_mut_slice()[3..6]
                    .copy_from_slice(&omega.map(|x| x as f32));
                scenes.push((world, bodies));
            }
            let mut errors = [0.0_f64; 3];
            for _ in 0..hz {
                for (world, _) in &mut scenes {
                    world.step();
                }
                for root in 1..3 {
                    for body in 0..3 {
                        let a = &scenes[0].0.bodies[scenes[0].1[body]];
                        let b = &scenes[root].0.bodies[scenes[root].1[body]];
                        errors[0] = errors[0].max(norm(difference(center_of(a), center_of(b))));
                        errors[1] = errors[1].max(rotation_distance(*a.rotation(), *b.rotation()));
                        errors[2] =
                            errors[2].max(norm(difference(vec(a.linvel()), vec(b.linvel()))));
                    }
                }
            }
            println!("AGGREGATE_ROOT_ORDER hz={hz} substeps={substeps} errors={errors:?}");
            #[cfg(feature = "candidate")]
            assert!(errors.iter().all(|x| *x < 5e-5));
        }
    }
}

#[test]
fn record_trajectory_inputs() {
    for root in 0..3 {
        let (aggregate, _) = aggregate(1.0, root, 0.0, true);
        let (world, bodies, _) = fixture(1.0, root, 0.0, true);
        println!("AGGREGATE_TRAJECTORY_INPUT root={root} principal={:?} frame={:?} rotation={:?} omega={:?}",
            aggregate.principal_inertia().to_array(), aggregate.principal_inertia_local_frame.to_array(),
            world.bodies[bodies[root]].rotation().to_array(), [2.0_f32,-3.0,4.0]);
    }
}

fn quaternion_distance(mut a: [f64; 4], mut b: [f64; 4]) -> f64 {
    let na = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let nb = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    for i in 0..4 {
        a[i] /= na;
        b[i] /= nb;
    }
    let minus = (0..4).map(|i| (a[i] - b[i]).powi(2)).sum::<f64>();
    let plus = (0..4).map(|i| (a[i] + b[i]).powi(2)).sum::<f64>();
    4.0 * (0.5 * minus.min(plus).sqrt()).min(1.0).asin()
}
#[test]
fn aggregate_trajectory_converges_to_independently_refined_rk4() {
    let mut rows = Vec::new();
    for line in include_str!("../trajectory-reference.txt").lines() {
        let values: Vec<f64> = line.split(',').map(|x| x.parse().unwrap()).collect();
        assert_eq!(values.len(), 20);
        let root = values[0] as usize;
        let hz = values[1] as usize;
        let principal: V = values[2..5].try_into().unwrap();
        let frame: [f64; 4] = values[5..9].try_into().unwrap();
        let initial: [f64; 4] = values[9..13].try_into().unwrap();
        let initial_omega: V = values[13..16].try_into().unwrap();
        let expected: [f64; 4] = values[16..20].try_into().unwrap();
        let (props, _) = aggregate(1.0, root, 0.0, true);
        assert_eq!(
            principal,
            props.principal_inertia().to_array().map(|x| x as f64)
        );
        assert_eq!(
            frame,
            props
                .principal_inertia_local_frame
                .to_array()
                .map(|x| x as f64)
        );
        let (mut world, bodies, handle) = fixture(1.0, root, 0.0, true);
        assert_eq!(
            initial,
            world.bodies[bodies[root]]
                .rotation()
                .to_array()
                .map(|x| x as f64)
        );
        world.integration_parameters.dt = 1.0 / hz as f32;
        world.integration_parameters.num_solver_iterations = 1;
        world.physics_pipeline.counters.enable();
        let (mb, _) = world.multibody_joints.get_mut(handle).unwrap();
        mb.damping_mut().fill(0.0);
        mb.generalized_velocity_mut().fill(0.0);
        mb.generalized_velocity_mut().as_mut_slice()[3..6]
            .copy_from_slice(&initial_omega.map(|x| x as f32));
        let mut q = initial;
        let mut omega = initial_omega;
        let mut accepted = 0;
        for _ in 0..hz {
            let next = arithmetic_reference::rigid_rotation_step(
                q,
                frame,
                principal,
                omega,
                world.integration_parameters.dt as f64,
            )
            .unwrap();
            q = next.rotation;
            omega = next.angular_velocity;
            world.step();
            accepted += assembly_counts(&world)[0];
        }
        let actual = world.bodies[bodies[root]]
            .rotation()
            .to_array()
            .map(|x| x as f64);
        let reference_error = quaternion_distance(q, expected);
        let native_error = quaternion_distance(actual, expected);
        let roundoff = quaternion_distance(actual, q);
        println!("AGGREGATE_TRAJECTORY root={root} hz={hz} reference_error={reference_error:e} native_error={native_error:e} storage_difference={roundoff:e} accepted={accepted}");
        #[cfg(feature = "candidate")]
        {
            assert_eq!(accepted, hz);
            assert!(roundoff < 1e-5);
        }
        rows.push((root, hz, reference_error, native_error));
    }
    assert_eq!(rows.len(), 9);
    for root in 0..3 {
        let errors: Vec<_> = rows.iter().filter(|r| r.0 == root).collect();
        assert_eq!(errors.len(), 3);
        for pair in errors.windows(2) {
            assert!(pair[1].2 < pair[0].2 * 0.3);
            #[cfg(feature = "candidate")]
            assert!(pair[1].3 < pair[0].3 * 0.35 + 1e-5);
        }
    }
}

#[test]
fn uniform_gravity_preserves_spin_and_native_linear_step_convention() {
    let mut maxima = [0.0_f64; 5];
    let mut cases = 0;
    for scale in [0.01, 1.0, 100.0] {
        for root in 0..3 {
            for hz in [60, 240] {
                for substeps in [1, 4] {
                    for gravity_scale in [0.5, 1.0] {
                        let (mut world, bodies, handle) = fixture(scale, root, 0.0, true);
                        world.integration_parameters.dt = 1.0 / hz as f32;
                        world.integration_parameters.num_solver_iterations = substeps;
                        world.gravity = Vector::new(0.0, -9.81 * scale, 0.0);
                        for h in &bodies {
                            world.bodies[*h].set_gravity_scale(gravity_scale, true);
                        }
                        world.physics_pipeline.counters.enable();
                        let root_center = center_of(&world.bodies[bodies[root]]);
                        let v = Vector::new(0.3, -0.2, 0.1) * scale;
                        let w = Vector::new(2.0, -3.0, 4.0);
                        let (mb, _) = world.multibody_joints.get_mut(handle).unwrap();
                        mb.damping_mut().fill(0.0);
                        mb.generalized_velocity_mut().as_mut_slice()[..3]
                            .copy_from_slice(&v.to_array());
                        mb.generalized_velocity_mut().as_mut_slice()[3..6]
                            .copy_from_slice(&w.to_array());
                        let (mass, c0, p0, l0, e0) =
                            quantities(&world, &bodies, Some((vec(v), vec(w), root_center)));
                        let spin0 = e0 - norm(p0).powi(2) / (2.0 * mass);
                        assert!(spin0 > 0.0);
                        let acceleration = vec(world.gravity * gravity_scale);
                        let h = (world.integration_parameters.dt / substeps as f32) as f64;
                        let mut errors = [0.0_f64; 5];
                        let mut counts = [0usize; 4];
                        for step in 1..=hz {
                            world.step();
                            let (_, c, p, l, e) = quantities(&world, &bodies, None);
                            let k = (step * substeps) as f64;
                            let time = k * h;
                            let expected_p: V =
                                core::array::from_fn(|i| p0[i] + mass * acceleration[i] * time);
                            let expected_c: V = core::array::from_fn(|i| {
                                c0[i]
                                    + p0[i] / mass * time
                                    + 0.5 * acceleration[i] * h * h * k * (k + 1.0)
                            });
                            let spin = e - norm(p).powi(2) / (2.0 * mass);
                            let work: f64 = (0..3)
                                .map(|i| {
                                    p0[i] * acceleration[i] * time
                                        + 0.5
                                            * mass
                                            * acceleration[i]
                                            * acceleration[i]
                                            * time
                                            * time
                                })
                                .sum();
                            let values = [
                                norm(difference(p, expected_p)) / (mass * scale as f64),
                                norm(difference(l, l0)) / norm(l0),
                                (spin / spin0 - 1.0).abs(),
                                norm(difference(c, expected_c)) / scale as f64,
                                ((e - e0 - work) / e0).abs(),
                            ];
                            for i in 0..5 {
                                assert!(values[i].is_finite());
                                errors[i] = errors[i].max(values[i]);
                            }
                            for i in 0..4 {
                                counts[i] += assembly_counts(&world)[i];
                            }
                        }
                        println!("AGGREGATE_GRAVITY root={root} scale={scale} hz={hz} substeps={substeps} gravity_scale={gravity_scale} errors={errors:?} counts={counts:?}");
                        #[cfg(feature = "candidate")]
                        {
                            assert_eq!(counts, [hz * substeps, 0, 0, 0]);
                            assert!(errors.iter().all(|x| *x < 1e-4));
                        }
                        for i in 0..5 {
                            maxima[i] = maxima[i].max(errors[i]);
                        }
                        cases += 1;
                    }
                }
            }
        }
    }
    assert_eq!(cases, 72);
    println!("AGGREGATE_GRAVITY_SUMMARY cases={cases} errors={maxima:?}");
}

#[test]
fn changing_uniform_gravity_rebuilds_cached_acceleration() {
    for root in 0..3 {
        let (mut world, bodies, handle) = fixture(1.0, root, 0.0, true);
        world.integration_parameters.dt = 1.0 / 120.0;
        world.integration_parameters.num_solver_iterations = 4;
        world.physics_pipeline.counters.enable();
        let v = Vector::new(0.3, -0.2, 0.1);
        let w = Vector::new(2.0, -3.0, 4.0);
        let root_center = center_of(&world.bodies[bodies[root]]);
        let (mb, _) = world.multibody_joints.get_mut(handle).unwrap();
        mb.damping_mut().fill(0.0);
        mb.generalized_velocity_mut().as_mut_slice()[..3].copy_from_slice(&v.to_array());
        mb.generalized_velocity_mut().as_mut_slice()[3..6].copy_from_slice(&w.to_array());
        let (mass, mut expected_center, initial_p, initial_l, initial_e) =
            quantities(&world, &bodies, Some((vec(v), vec(w), root_center)));
        let initial_spin = initial_e - norm(initial_p).powi(2) / (2.0 * mass);
        let mut expected_velocity = initial_p.map(|x| x / mass);
        let h = (world.integration_parameters.dt / 4.0) as f64;
        let mut maxima = [0.0_f64; 4];
        for step in 0..72 {
            world.gravity = match (step / 12) % 3 {
                0 => Vector::new(0.0, -9.81, 0.0),
                1 => Vector::new(3.0, 0.0, -2.0),
                _ => Vector::ZERO,
            };
            let gravity_scale = [1.0, 0.0, -0.5, 2.0][(step / 6) % 4];
            for body in &bodies {
                world.bodies[*body].set_gravity_scale(gravity_scale, true);
            }
            let acceleration = vec(world.gravity * gravity_scale);
            for _ in 0..4 {
                for i in 0..3 {
                    expected_velocity[i] += acceleration[i] * h;
                    expected_center[i] += expected_velocity[i] * h;
                }
            }
            world.step();
            let (_, center, momentum, angular, energy) = quantities(&world, &bodies, None);
            let spin = energy - norm(momentum).powi(2) / (2.0 * mass);
            let errors = [
                norm(difference(momentum.map(|x| x / mass), expected_velocity)),
                norm(difference(center, expected_center)),
                norm(difference(angular, initial_l)) / norm(initial_l),
                (spin / initial_spin - 1.0).abs(),
            ];
            for i in 0..4 {
                assert!(errors[i].is_finite());
                maxima[i] = maxima[i].max(errors[i]);
            }
            #[cfg(feature = "candidate")]
            {
                assert_eq!(assembly_counts(&world), [4, 0, 0, 0]);
                assert!(errors.iter().all(|x| *x < 1e-4));
            }
        }
        println!("AGGREGATE_GRAVITY_SWITCH root={root} errors={maxima:?}");
    }
}

#[test]
fn separating_all_links_preserves_instantaneous_motion() {
    for root in 0..3 {
        let (mut world, bodies, handle) = fixture(1.0, root, 0.0, true);
        world.integration_parameters.dt = 1.0 / 120.0;
        world.integration_parameters.num_solver_iterations = 4;
        world.physics_pipeline.counters.enable();
        let (mb, _) = world.multibody_joints.get_mut(handle).unwrap();
        mb.damping_mut().fill(0.0);
        mb.generalized_velocity_mut().as_mut_slice()[..6]
            .copy_from_slice(&[0.3, -0.2, 0.1, 2.0, -3.0, 4.0]);
        for _ in 0..24 {
            world.step();
        }
        let before: Vec<_> = bodies
            .iter()
            .map(|h| {
                let rb = &world.bodies[*h];
                (*rb.position(), rb.linvel(), rb.angvel())
            })
            .collect();
        let (mass, c0, p0, l0, e0) = quantities(&world, &bodies, None);
        world
            .multibody_joints
            .remove_joints_attached_to_rigid_body(bodies[root]);
        for (i, h) in bodies.iter().enumerate() {
            assert!(world.multibody_joints.rigid_body_link(*h).is_none());
            let rb = &world.bodies[*h];
            assert_eq!((*rb.position(), rb.linvel(), rb.angvel()), before[i]);
        }
        let mut maxima = [0.0_f64; 4];
        for step in 1..=120 {
            world.step();
            assert_eq!(assembly_counts(&world), [0; 4]);
            let (_, c, p, l, e) = quantities(&world, &bodies, None);
            let t = step as f64 * world.integration_parameters.dt as f64;
            let expected: V = core::array::from_fn(|i| c0[i] + p0[i] / mass * t);
            let errors = [
                norm(difference(p, p0)) / norm(p0),
                norm(difference(l, l0)) / norm(l0),
                (e / e0 - 1.0).abs(),
                norm(difference(c, expected)),
            ];
            for i in 0..4 {
                assert!(errors[i].is_finite());
                maxima[i] = maxima[i].max(errors[i]);
            }
            assert!(errors.iter().all(|x| *x < 1e-4));
        }
        println!("AGGREGATE_DETACH root={root} errors={maxima:?}");
    }
}

#[test]
fn split_chain_preserves_motion_and_explicit_zero_damping() {
    let mut world = PhysicsWorld::new();
    world.gravity = Vector::ZERO;
    world.integration_parameters.dt = 1.0 / 120.0;
    world.integration_parameters.num_solver_iterations = 4;
    world.physics_pipeline.counters.enable();
    let bodies: Vec<_> = (0..4)
        .map(|i| {
            let mass = (i + 1) as f32;
            world.bodies.insert(
                RigidBodyBuilder::dynamic()
                    .can_sleep(false)
                    .translation(Vector::new(i as f32, 0.0, 0.0))
                    .additional_mass_properties(MassProperties::with_principal_inertia_frame(
                        Vector::new(0.1, 0.05, -0.02) * mass,
                        mass,
                        Vector::new(0.2, 0.3, 0.4) * mass,
                        Rotation::IDENTITY,
                    )),
            )
        })
        .collect();
    let joints: Vec<_> = (0..3)
        .map(|i| {
            world
                .multibody_joints
                .insert(
                    bodies[i],
                    bodies[i + 1],
                    FixedJointBuilder::new().local_anchor1(Vector::X).build(),
                    true,
                )
                .unwrap()
        })
        .collect();
    world.step();
    let (mb, _) = world.multibody_joints.get_mut(joints[0]).unwrap();
    mb.damping_mut().fill(0.0);
    mb.generalized_velocity_mut().as_mut_slice()[..6]
        .copy_from_slice(&[0.3, -0.2, 0.1, 2.0, -3.0, 4.0]);
    for _ in 0..24 {
        world.step();
    }
    let before: Vec<_> = bodies
        .iter()
        .map(|h| {
            let rb = &world.bodies[*h];
            (*rb.position(), rb.linvel(), rb.angvel())
        })
        .collect();
    let (mass, c0, p0, l0, e0) = quantities(&world, &bodies, None);
    world.multibody_joints.remove(joints[1], true);
    for (i, h) in bodies.iter().enumerate() {
        let rb = &world.bodies[*h];
        assert_eq!((*rb.position(), rb.linvel(), rb.angvel()), before[i]);
    }
    let mut maxima = [0.0_f64; 4];
    for step in 1..=24 {
        world.step();
        let (_, c, p, l, e) = quantities(&world, &bodies, None);
        let time = step as f64 * world.integration_parameters.dt as f64;
        let expected: V = core::array::from_fn(|i| c0[i] + p0[i] / mass * time);
        let errors = [
            norm(difference(p, p0)) / norm(p0),
            norm(difference(l, l0)) / norm(l0),
            (e / e0 - 1.0).abs(),
            norm(difference(c, expected)),
        ];
        for i in 0..4 {
            assert!(errors[i].is_finite());
            maxima[i] = maxima[i].max(errors[i]);
        }
        if step == 1 || step == 24 {
            for handle in [joints[0], joints[2]] {
                let (mb, _) = world.multibody_joints.get_mut(handle).unwrap();
                println!(
                    "SPLIT_DAMPING step={step} values={:?}",
                    mb.damping_mut().as_slice()
                );
            }
            println!(
                "SPLIT_MOTION step={step} errors={errors:?} counts={:?}",
                assembly_counts(&world)
            );
        }
    }
    println!("SPLIT_MAXIMUM errors={maxima:?}");
    assert!(maxima.iter().all(|x| *x < 1e-4));
}

#[test]
fn split_chain_scale_gravity_orientation_matrix() {
    let mut cases = 0;
    let mut maxima = [0.0_f64; 4];
    for scale in [0.01, 1.0, 100.0] {
        for reverse in [false, true] {
            for tilted in [false, true] {
                for gravity in [false, true] {
                    for hz in [60, 240] {
                        let mut world = PhysicsWorld::new();
                        world.gravity = if gravity {
                            Vector::new(0.0, -9.81 * scale, 0.0)
                        } else {
                            Vector::ZERO
                        };
                        world.integration_parameters.dt = 1.0 / hz as f32;
                        world.integration_parameters.num_solver_iterations = 4;
                        world.physics_pipeline.counters.enable();
                        let rotation = if tilted {
                            Rotation::from_scaled_axis(Vector::new(0.4, -0.3, 0.7))
                        } else {
                            Rotation::IDENTITY
                        };
                        let mut bodies: Vec<_> = (0..4)
                            .map(|i| {
                                let mass = (i + 1) as f32;
                                world.bodies.insert(
                                    RigidBodyBuilder::dynamic()
                                        .can_sleep(false)
                                        .pose(Pose::from_parts(
                                            rotation * Vector::new(i as f32 * scale, 0.0, 0.0),
                                            rotation,
                                        ))
                                        .additional_mass_properties(
                                            MassProperties::with_principal_inertia_frame(
                                                Vector::new(0.1, 0.05, -0.02) * (mass * scale),
                                                mass,
                                                Vector::new(0.2, 0.3, 0.4) * (mass * scale * scale),
                                                Rotation::IDENTITY,
                                            ),
                                        ),
                                )
                            })
                            .collect();
                        if reverse {
                            bodies.reverse();
                        }
                        let joints: Vec<_> = (0..3)
                            .map(|i| {
                                world
                                    .multibody_joints
                                    .insert(
                                        bodies[i],
                                        bodies[i + 1],
                                        FixedJointBuilder::new()
                                            .local_anchor1(
                                                Vector::X * if reverse { -scale } else { scale },
                                            )
                                            .build(),
                                        true,
                                    )
                                    .unwrap()
                            })
                            .collect();
                        world.step();
                        let (mb, _) = world.multibody_joints.get_mut(joints[0]).unwrap();
                        mb.damping_mut().fill(0.0);
                        mb.generalized_velocity_mut().as_mut_slice()[..6].copy_from_slice(&[
                            0.3 * scale,
                            -0.2 * scale,
                            0.1 * scale,
                            2.0,
                            -3.0,
                            4.0,
                        ]);
                        for _ in 0..12 {
                            world.step();
                        }
                        let (mass, c0, p0, l0, e0) = quantities(&world, &bodies, None);
                        world.multibody_joints.remove(joints[1], true);
                        let acceleration = vec(world.gravity);
                        let h = (world.integration_parameters.dt / 4.0) as f64;
                        let mut errors = [0.0_f64; 4];
                        for step in 1..=24 {
                            world.step();
                            let (_, c, p, l, e) = quantities(&world, &bodies, None);
                            let k = (step * 4) as f64;
                            let time = k * h;
                            let expected_p: V =
                                core::array::from_fn(|i| p0[i] + mass * acceleration[i] * time);
                            let expected_c: V = core::array::from_fn(|i| {
                                c0[i]
                                    + p0[i] / mass * time
                                    + 0.5 * acceleration[i] * h * h * k * (k + 1.0)
                            });
                            let work: f64 = (0..3)
                                .map(|i| {
                                    p0[i] * acceleration[i] * time
                                        + 0.5 * mass * acceleration[i].powi(2) * time * time
                                })
                                .sum();
                            let values = [
                                norm(difference(p, expected_p)) / (mass * scale as f64),
                                norm(difference(l, l0)) / norm(l0),
                                ((e - e0 - work) / e0).abs(),
                                norm(difference(c, expected_c)) / scale as f64,
                            ];
                            for i in 0..4 {
                                assert!(values[i].is_finite());
                                errors[i] = errors[i].max(values[i]);
                            }
                            assert_eq!(assembly_counts(&world), [8, 0, 0, 0]);
                        }
                        println!("SPLIT_MATRIX scale={scale} reverse={reverse} tilted={tilted} gravity={gravity} hz={hz} errors={errors:?}");
                        assert!(errors.iter().all(|x| *x < 1e-4));
                        for i in 0..4 {
                            maxima[i] = maxima[i].max(errors[i]);
                        }
                        cases += 1;
                    }
                }
            }
        }
    }
    assert_eq!(cases, 48);
    println!("SPLIT_MATRIX_SUMMARY cases={cases} errors={maxima:?}");
}

#[test]
fn split_keeps_surviving_root_generalized_properties() {
    let (mut world, bodies, removed) = fixture(1.0, 0, 0.0, true);
    let damping = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    let armature = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
    let friction = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06];
    let (mb, _) = world.multibody_joints.get_mut(removed).unwrap();
    mb.damping_mut().as_mut_slice().copy_from_slice(&damping);
    mb.armature_mut().as_mut_slice().copy_from_slice(&armature);
    mb.frictions_mut().as_mut_slice().copy_from_slice(&friction);
    mb.add_dof_coupling(rapier3d::dynamics::MultibodyDofCoupling {
        link1: 0,
        dof1: 0,
        axis1: 0,
        link2: 0,
        dof2: 1,
        axis2: 1,
        coeff: 2.0,
        offset: 0.0,
    });
    mb.generalized_velocity_mut()
        .as_mut_slice()
        .copy_from_slice(&[0.3, -0.2, 0.1, 2.0, -3.0, 4.0]);
    world.step();
    let before = world
        .multibody_joints
        .get(removed)
        .unwrap()
        .0
        .generalized_velocity()
        .as_slice()
        .to_vec();
    world.multibody_joints.remove(removed, true);
    let index = world
        .multibody_joints
        .rigid_body_link(bodies[0])
        .unwrap()
        .multibody;
    let mb = world.multibody_joints.get_multibody(index).unwrap();
    println!(
        "SPLIT_RETAINED_ROOT velocities={:?} damping={:?} armature={:?} friction={:?}",
        mb.generalized_velocity().as_slice(),
        mb.damping().as_slice(),
        mb.armature().as_slice(),
        mb.frictions().as_slice()
    );
    assert_eq!(mb.generalized_velocity().as_slice(), before);
    assert_eq!(mb.damping().as_slice(), damping);
    assert_eq!(mb.armature().as_slice(), armature);
    assert_eq!(mb.frictions().as_slice(), friction);
    assert_eq!(mb.couplings().len(), 1);
    let coupling = mb.couplings()[0];
    assert_eq!(
        (
            coupling.link1,
            coupling.dof1,
            coupling.axis1,
            coupling.link2,
            coupling.dof2,
            coupling.axis2
        ),
        (0, 0, 0, 0, 1, 1)
    );
    assert_eq!((coupling.coeff, coupling.offset), (2.0, 0.0));
    world.step();
    let mb = world.multibody_joints.get_multibody(index).unwrap();
    assert_eq!(mb.damping().as_slice(), damping);
    assert_eq!(mb.armature().as_slice(), armature);
    assert_eq!(mb.frictions().as_slice(), friction);
    assert_eq!(mb.couplings().len(), 1);
    let coupling = mb.couplings()[0];
    assert_eq!(
        (
            coupling.link1,
            coupling.dof1,
            coupling.axis1,
            coupling.link2,
            coupling.dof2,
            coupling.axis2
        ),
        (0, 0, 0, 0, 1, 1)
    );
    assert_eq!((coupling.coeff, coupling.offset), (2.0, 0.0));
}

#[test]
fn fixed_to_dynamic_root_preserves_prescribed_world_com_velocity() {
    for root in 0..3 {
        let (mut world, bodies, _) = fixture(1.0, root, 0.0, true);
        world.integration_parameters.dt = 1.0 / 120.0;
        world.integration_parameters.num_solver_iterations = 4;
        world.physics_pipeline.counters.enable();
        world.bodies[bodies[root]].set_body_type(RigidBodyType::Fixed, true);
        world.step();
        let v = Vector::new(0.3, -0.2, 0.1);
        let w = Vector::new(2.0, -3.0, 4.0);
        world.bodies[bodies[root]].set_body_type(RigidBodyType::Dynamic, true);
        world.bodies[bodies[root]].set_linvel(v, true);
        world.bodies[bodies[root]].set_angvel(w, true);
        let root_center = center_of(&world.bodies[bodies[root]]);
        let (mass, c0, p0, l0, e0) =
            quantities(&world, &bodies, Some((vec(v), vec(w), root_center)));
        world.step();
        let (_, c, p, l, e) = quantities(&world, &bodies, None);
        let time = world.integration_parameters.dt as f64;
        let expected: V = core::array::from_fn(|i| c0[i] + p0[i] / mass * time);
        let errors = [
            norm(difference(p, p0)) / norm(p0),
            norm(difference(l, l0)) / norm(l0),
            (e / e0 - 1.0).abs(),
            norm(difference(c, expected)),
        ];
        println!(
            "ROOT_ACTIVATION root={root} errors={errors:?} counts={:?}",
            assembly_counts(&world)
        );
        assert!(errors.iter().all(|x| *x < 1e-5));
        assert_eq!(assembly_counts(&world), [4, 0, 0, 0]);
    }
}

#[test]
fn removing_chain_material_preserves_remaining_motion() {
    for removed in 0..4 {
        let mut world = PhysicsWorld::new();
        world.gravity = Vector::ZERO;
        world.integration_parameters.dt = 1.0 / 120.0;
        world.integration_parameters.num_solver_iterations = 4;
        world.physics_pipeline.counters.enable();
        let bodies: Vec<_> = (0..4)
            .map(|i| {
                let mass = (i + 1) as f32;
                world.bodies.insert(
                    RigidBodyBuilder::dynamic()
                        .can_sleep(false)
                        .translation(Vector::new(i as f32, 0.0, 0.0))
                        .additional_mass_properties(MassProperties::with_principal_inertia_frame(
                            Vector::new(0.1, 0.05, -0.02) * mass,
                            mass,
                            Vector::new(0.2, 0.3, 0.4) * mass,
                            Rotation::IDENTITY,
                        )),
                )
            })
            .collect();
        let joints: Vec<_> = (0..3)
            .map(|i| {
                world
                    .multibody_joints
                    .insert(
                        bodies[i],
                        bodies[i + 1],
                        FixedJointBuilder::new().local_anchor1(Vector::X).build(),
                        true,
                    )
                    .unwrap()
            })
            .collect();
        world.step();
        let (mb, _) = world.multibody_joints.get_mut(joints[0]).unwrap();
        mb.damping_mut().fill(0.0);
        mb.generalized_velocity_mut()
            .as_mut_slice()
            .copy_from_slice(&[0.3, -0.2, 0.1, 2.0, -3.0, 4.0]);
        for _ in 0..24 {
            world.step();
        }
        let remaining: Vec<_> = bodies
            .iter()
            .enumerate()
            .filter_map(|(i, h)| if i != removed { Some(*h) } else { None })
            .collect();
        let before: Vec<_> = remaining
            .iter()
            .map(|h| {
                let b = &world.bodies[*h];
                (*b.position(), b.linvel(), b.angvel())
            })
            .collect();
        let (mass, c0, p0, l0, e0) = quantities(&world, &remaining, None);
        assert!(world.remove_body(bodies[removed]).is_some());
        for (i, h) in remaining.iter().enumerate() {
            let b = &world.bodies[*h];
            assert_eq!((*b.position(), b.linvel(), b.angvel()), before[i]);
        }
        let mut maxima = [0.0_f64; 4];
        for step in 1..=120 {
            world.step();
            let (_, c, p, l, e) = quantities(&world, &remaining, None);
            let time = step as f64 * world.integration_parameters.dt as f64;
            let expected: V = core::array::from_fn(|i| c0[i] + p0[i] / mass * time);
            let errors = [
                norm(difference(p, p0)) / norm(p0),
                norm(difference(l, l0)) / norm(l0),
                (e / e0 - 1.0).abs(),
                norm(difference(c, expected)),
            ];
            for i in 0..4 {
                assert!(errors[i].is_finite());
                maxima[i] = maxima[i].max(errors[i]);
            }
            assert_eq!(assembly_counts(&world), [4, 0, 0, 0]);
        }
        println!("REMOVED_MATERIAL index={removed} errors={maxima:?}");
        assert!(maxima.iter().all(|x| *x < 1e-4));
    }
}
