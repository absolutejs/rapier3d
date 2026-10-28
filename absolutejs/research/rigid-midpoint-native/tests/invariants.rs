use absolutejs_rigid_midpoint_reference::midpoint::{midpoint_step, MidpointError};
type V = [f64; 3];
type Q = [f64; 4];
fn norm(v: V) -> f64 {
    v.iter().map(|x| x * x).sum::<f64>().sqrt()
}
fn cross(a: V, b: V) -> V {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}
fn rotate(q: Q, v: V) -> V {
    let u = [q[0], q[1], q[2]];
    let t = cross(u, v).map(|x| 2.0 * x);
    let s = cross(u, t);
    core::array::from_fn(|i| v[i] + q[3] * t[i] + s[i])
}
fn multiply(a: Q, b: Q) -> Q {
    let mut q = [
        a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
        a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
        a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ];
    let n = q.iter().map(|x| x * x).sum::<f64>().sqrt();
    for x in &mut q {
        *x /= n;
    }
    q
}
fn energy(j: V, inv: V) -> f64 {
    0.5 * (0..3).map(|i| j[i] * j[i] * inv[i]).sum::<f64>()
}
#[test]
fn matched_native_midpoint_conserves_energy_and_world_vector() {
    let mut maximum_energy = 0.0_f64;
    let mut maximum_momentum = 0.0_f64;
    let mut maximum_iterations = 0;
    for inertia in [
        [2.0, 3.0, 4.0],
        [0.005, 1.0, 1.0],
        [1.0, 1.0, 2.0],
        [1.0, 1.0, 1.0],
    ] {
        for scale in [1e-20, 1.0, 1e20] {
            let inertia = inertia.map(|i| i * scale);
            let inverse = inertia.map(|i| 1.0 / i);
            let mut j: V = core::array::from_fn(|i| inertia[i] * [2.0, -3.0, 4.0][i]);
            let mut q = multiply([0., 0., 0., 1.], [0.2, 0.3, 0.1, 0.9]);
            let initial_energy = energy(j, inverse);
            let initial_momentum = rotate(q, j);
            for _ in 0..2400 {
                let step = midpoint_step(j, inverse, 1.0 / 240.0).unwrap();
                j = step.momentum;
                q = multiply(q, step.rotation_increment);
                maximum_iterations = maximum_iterations.max(step.iterations);
                maximum_energy =
                    maximum_energy.max((energy(j, inverse) / initial_energy - 1.0).abs());
                let current = rotate(q, j);
                maximum_momentum = maximum_momentum.max(
                    norm(core::array::from_fn(|i| current[i] - initial_momentum[i]))
                        / norm(initial_momentum),
                );
            }
        }
    }
    println!("12 cases / 28800 steps: relative energy {maximum_energy:e}, world momentum {maximum_momentum:e}, Newton iterations {maximum_iterations}");
    assert!(maximum_energy < 1e-10);
    assert!(maximum_momentum < 1e-10);
    assert!(maximum_iterations <= 5);
}
#[test]
fn native_step_is_reversible() {
    let initial = [4., -9., 16.];
    let inv = [0.5, 1.0 / 3.0, 0.25];
    let mut j = initial;
    let mut q = [0., 0., 0., 1.];
    for dt in [1.0 / 120.0, -1.0 / 120.0] {
        for _ in 0..120 {
            let s = midpoint_step(j, inv, dt).unwrap();
            j = s.momentum;
            q = multiply(q, s.rotation_increment);
        }
    }
    assert!(norm(core::array::from_fn(|i| j[i] - initial[i])) < 1e-10);
    assert!(norm([q[0], q[1], q[2]]) < 1e-10);
}
#[test]
fn principal_axis_rotation_uses_matching_cayley_angle() {
    let s = midpoint_step([4., 0., 0.], [0.5, 1.0 / 3.0, 0.25], 0.1).unwrap();
    assert_eq!(s.momentum, [4., 0., 0.]);
    assert!((s.rotation_increment[0] - 0.1_f64.atan().sin()).abs() < 1e-15);
    assert!((s.rotation_increment[3] - 0.1_f64.atan().cos()).abs() < 1e-15);
    let still = midpoint_step([0.; 3], [0.5, 1.0 / 3.0, 0.25], 0.1).unwrap();
    assert_eq!(still.rotation_increment, [0., 0., 0., 1.]);
}
#[test]
fn invalid_or_unrepresentable_states_return_no_partial_pose() {
    for inverse in [[0., 1., 1.], [-1., 1., 1.], [f64::NAN, 1., 1.]] {
        assert_eq!(
            midpoint_step([1., 2., 3.], inverse, 0.1).unwrap_err(),
            MidpointError::InvalidInput
        );
    }
    assert_eq!(
        midpoint_step([1., 2., 3.], [1.; 3], 0.0).unwrap_err(),
        MidpointError::InvalidInput
    );
    assert_eq!(
        midpoint_step([f64::MAX; 3], [1.; 3], 0.1).unwrap_err(),
        MidpointError::NonFinite
    );
}

#[test]
fn principal_frame_roundtrips_preserve_native_f32_zero_torque_velocities() {
    use absolutejs_rigid_midpoint_reference::midpoint::rigid_rotation_step;
    let identity = [0., 0., 0., 1.];
    for principal in [[1., 1., 1.], [2., 3., 4.], [0.005, 1., 1.]] {
        for initial in [[6., 0., 0.], [0., 6., 0.], [0., 0., 6.]] {
            let mut q = identity;
            let mut w = initial;
            for _ in 0..2400 {
                let next = rigid_rotation_step(q, identity, principal, w, 1.0 / 240.0).unwrap();
                q = next.rotation.map(|x| x as f32 as f64);
                w = next.angular_velocity.map(|x| x as f32 as f64);
                assert_eq!(w, initial);
            }
        }
    }
}

#[test]
fn tilted_principal_frames_conserve_invariants_after_f32_storage_rounding() {
    use absolutejs_rigid_midpoint_reference::midpoint::rigid_rotation_step;
    let principal = [2., 3., 4.];
    let frame = multiply([0., 0., 0., 1.], [0.1, -0.3, 0.2, 0.9]).map(|x| x as f32 as f64);
    let initial_q = multiply([0., 0., 0., 1.], [0.2, 0.3, 0.1, 0.9]).map(|x| x as f32 as f64);
    let initial_w = [2., -3., 4.];
    let quantities = |q: Q, w: V| {
        let pq = multiply(q, frame);
        let omega = rotate([-pq[0], -pq[1], -pq[2], pq[3]], w);
        let j = core::array::from_fn(|i| principal[i] * omega[i]);
        (rotate(pq, j), energy(j, principal.map(|i| 1.0 / i)))
    };
    let (l0, e0) = quantities(initial_q, initial_w);
    let mut q = initial_q;
    let mut w = initial_w;
    let mut maximum_l = 0.0_f64;
    let mut maximum_e = 0.0_f64;
    for _ in 0..2400 {
        let next = rigid_rotation_step(q, frame, principal, w, 1.0 / 240.0).unwrap();
        q = next.rotation.map(|x| x as f32 as f64);
        w = next.angular_velocity.map(|x| x as f32 as f64);
        let (l, e) = quantities(q, w);
        maximum_l = maximum_l.max(norm(core::array::from_fn(|i| l[i] - l0[i])) / norm(l0));
        maximum_e = maximum_e.max((e / e0 - 1.0).abs());
    }
    println!("f32 stored 2400-step tilted body/frame: relative energy {maximum_e:e}, world momentum {maximum_l:e}");
    assert!(maximum_l < 2e-5);
    assert!(maximum_e < 2e-5);
}

#[test]
fn native_trajectory_converges_at_second_order_to_independent_refined_rk4() {
    let mut maximum_angle = 0.0_f64;
    let mut count = 0;
    for line in include_str!("../rotation-fixtures.csv").lines() {
        let v: Vec<f64> = line.split(',').map(|x| x.parse().unwrap()).collect();
        assert_eq!(v.len(), 13);
        let inverse = [1.0 / v[0], 1.0 / v[1], 1.0 / v[2]];
        let initial = [v[0] * v[3], v[1] * v[4], v[2] * v[5]];
        let expected = [v[6], v[7], v[8], v[9]];
        let mut errors = Vec::new();
        for hz in [60, 120, 240] {
            let mut j = initial;
            let mut q = [0., 0., 0., 1.];
            for _ in 0..hz {
                let s = midpoint_step(j, inverse, 1.0 / hz as f64).unwrap();
                j = s.momentum;
                q = multiply(q, s.rotation_increment);
            }
            let relative = multiply(q, [-expected[0], -expected[1], -expected[2], expected[3]]);
            let angle =
                2.0 * norm([relative[0], relative[1], relative[2]]).atan2(relative[3].abs());
            maximum_angle = maximum_angle.max(angle);
            errors.push(angle);
            assert!(angle < 0.02, "case={count} hz={hz} angle={angle}");
        }
        for pair in errors.windows(2) {
            let ratio = pair[0] / pair[1];
            assert!(
                (3.7..4.3).contains(&ratio),
                "case={count} errors={errors:?}"
            );
        }
        count += 1;
    }
    assert_eq!(count, 12);
    println!("12 independent trajectories at 60/120/240 Hz: max angle {maximum_angle:e}; all error ratios 3.7..4.3");
}
