//! Authored-frame aggregation audit before any solver integration is changed.
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
fn aggregate(scale: f32, root: usize, shift: f32, tilted: bool) -> (MassProperties, Pose) {
    let authored = templates(scale);
    let mut world = PhysicsWorld::new();
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
            handle = world.multibody_joints.insert(
                bodies[root],
                bodies[i],
                FixedJointBuilder::new().local_frame1(authored[root].0.inverse() * authored[i].0),
                true,
            );
        }
    }
    world.step();
    let (mb, _) = world.multibody_joints.get(handle.unwrap()).unwrap();
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
