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

#[test]
fn physically_valid_thin_body_moments_do_not_make_the_newton_system_artificially_singular() {
    for small in [1e-6, 1e-12, 1e-20, 1e-30] {
        // These are physical moments: |I2-I3| <= I1 and all triangle inequalities hold.
        let inv = [1.0 / small, 1., 1.];
        let initial = [2.0 * small, -3., 4.];
        let mut j = initial;
        let mut q = [0., 0., 0., 1.];
        let e0 = energy(j, inv);
        for _ in 0..240 {
            let step = midpoint_step(j, inv, 1.0 / 240.0).unwrap();
            j = step.momentum;
            q = multiply(q, step.rotation_increment);
        }
        let l = rotate(q, j);
        assert!(
            norm(core::array::from_fn(|i| l[i] - initial[i])) / norm(initial) < 1e-10,
            "small={small}"
        );
        assert!((energy(j, inv) / e0 - 1.0).abs() < 1e-10, "small={small}");
    }
}

#[test]
fn physical_inertia_stress_matrix_preserves_invariants_with_bounded_iterations() {
    let mut seed = 0x327e129ab21_u64;
    let mut random = || {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        ((seed >> 11) as f64) / (1u64 << 53) as f64
    };
    let mut maximum_iterations = 0;
    let mut maximum_energy = 0.0_f64;
    let mut maximum_momentum = 0.0_f64;
    let mut cap_exceedances = 0;
    let mut nonphysical_stored = 0;
    let mut physical_cap_exceedances = 0;
    let mut maximum_coefficient = 0.0_f64;
    let mut cases = 0;
    for _ in 0..500 {
        let covariance = [
            10.0_f64.powf(-30.0 * random()),
            10.0_f64.powf(-30.0 * random()),
            1.0,
        ];
        let principal = [
            covariance[1] + covariance[2],
            covariance[0] + covariance[2],
            covariance[0] + covariance[1],
        ];
        let mut omega = [random() * 2. - 1., random() * 2. - 1., random() * 2. - 1.];
        let magnitude = norm(omega);
        for v in &mut omega {
            *v /= magnitude;
        }
        for scale in [1e-20, 1.0, 1e20] {
            for dt in [0.001, 0.1, core::f64::consts::FRAC_PI_4] {
                let moments = principal.map(|i| i * scale);
                let inverse = moments.map(|i| 1.0 / i);
                // Audit the actual values consumed by the inverse-moment API.
                // Positive covariance does not ensure independently rounded
                // principal moments still describe a physical inertia tensor.
                let stored = inverse.map(|i| 1.0 / i);
                let coefficients: V = core::array::from_fn(|i| {
                    (stored[(i + 1) % 3] - stored[(i + 2) % 3]) * inverse[i]
                });
                let coefficient = coefficients.iter().fold(0.0_f64, |a, x| a.max(x.abs()));
                maximum_coefficient = maximum_coefficient.max(coefficient);
                let physical = coefficient <= 1.0;
                if !physical {
                    nonphysical_stored += 1;
                }
                let initial: V = core::array::from_fn(|i| moments[i] * omega[i]);
                let e0 = energy(initial, inverse);
                let step = midpoint_step(initial, inverse, dt).unwrap();
                let world = rotate(step.rotation_increment, step.momentum);
                maximum_energy =
                    maximum_energy.max((energy(step.momentum, inverse) / e0 - 1.0).abs());
                maximum_momentum = maximum_momentum
                    .max(norm(core::array::from_fn(|i| world[i] - initial[i])) / norm(initial));
                maximum_iterations = maximum_iterations.max(step.iterations);
                let q = step.rotation_increment;
                let angle = 2.0 * norm([q[0], q[1], q[2]]).atan2(q[3].abs());
                if angle > core::f64::consts::FRAC_PI_4 {
                    cap_exceedances += 1;
                    if physical {
                        physical_cap_exceedances += 1;
                    }
                    println!("ANGLE_CAP_CASE moments={moments:?} omega={omega:?} dt={dt:e} angle={angle:e}");
                }
                cases += 1;
            }
        }
    }
    println!("physical stress cases={cases}, Newton max={maximum_iterations}, relative energy={maximum_energy:e}, momentum={maximum_momentum:e}, full-step angle-cap exceedances={cap_exceedances}");
    println!("stored-inertia audit: nonphysical={nonphysical_stored}, max Euler coefficient={maximum_coefficient:e}, physical cap exceedances={physical_cap_exceedances}");
    assert_eq!(physical_cap_exceedances, 0);
    assert!(nonphysical_stored > 0);
    assert_eq!(cases, 4500);
    assert!(maximum_iterations <= 8);
    assert!(maximum_energy < 1e-10);
    assert!(maximum_momentum < 1e-10);
}

#[test]
fn admission_rejects_nonphysical_stored_moments_without_clamping() {
    use absolutejs_rigid_midpoint_reference::midpoint::bounded_midpoint_step;
    for scale in [2.0_f64.powi(-60), 1.0, 2.0_f64.powi(60)] {
        // Saved cap counterexample: rounding makes |I1-I2| exceed I3.
        let moments = [
            1.0000000000000002 * scale,
            scale,
            1.5070022372528486e-16 * scale,
        ];
        let j = moments.map(|i| i * 0.5);
        assert_eq!(
            bounded_midpoint_step(j, moments, 0.1, 0.5).unwrap_err(),
            MidpointError::NonPhysicalInertia
        );
    }
    // Tiny but truly physical moments remain supported, with no ratio cutoff.
    assert!(bounded_midpoint_step([1e-30, 1., 1.], [1e-30, 1., 1.], 0.01, 0.5).is_ok());
}

#[test]
fn admission_checks_actual_rotation_in_both_time_directions() {
    use absolutejs_rigid_midpoint_reference::midpoint::bounded_midpoint_step;
    let cap = core::f64::consts::FRAC_PI_4;
    for sign in [-1.0, 1.0] {
        assert_eq!(
            bounded_midpoint_step([2., 0., 0.], [1.; 3], sign, cap).unwrap_err(),
            MidpointError::RotationLimit
        );
        let step = bounded_midpoint_step([0.5, 0., 0.], [1.; 3], sign, cap).unwrap();
        assert_eq!(step.momentum, [0.5, 0., 0.]);
        assert_eq!(step.iterations, 0);
    }
    for cap in [0.0, -1.0, f64::NAN, f64::INFINITY, core::f64::consts::PI] {
        assert_eq!(
            bounded_midpoint_step([1.; 3], [1.; 3], 0.1, cap).unwrap_err(),
            MidpointError::InvalidInput
        );
    }
}

#[test]
fn representable_physical_covariances_qualify_the_admission_boundary() {
    use absolutejs_rigid_midpoint_reference::midpoint::bounded_midpoint_step;
    let mut count = 0;
    for a in [1.0, 2.0, 8.0, 128.0] {
        for b in [1.0, 4.0, 32.0, 256.0] {
            for c in [1.0, 16.0, 64.0, 512.0] {
                for scale in [2.0_f64.powi(-60), 1.0, 2.0_f64.powi(60)] {
                    let moments = [(b + c) * scale, (a + c) * scale, (a + b) * scale];
                    for omega in [[1., 0., 0.], [0., 1., 0.], [0., 0., 1.], [0.36, -0.48, 0.8]] {
                        let j = core::array::from_fn(|i| moments[i] * omega[i]);
                        for dt in [-0.5, -0.01, 0.01, 0.5] {
                            let step =
                                bounded_midpoint_step(j, moments, dt, core::f64::consts::FRAC_PI_4)
                                    .unwrap();
                            let inv = moments.map(|i| 1.0 / i);
                            assert!(
                                (energy(step.momentum, inv) / energy(j, inv) - 1.0).abs() < 1e-12
                            );
                            let world = rotate(step.rotation_increment, step.momentum);
                            assert!(
                                norm(core::array::from_fn(|i| world[i] - j[i])) / norm(j) < 1e-12
                            );
                            count += 1;
                        }
                    }
                }
            }
        }
    }
    assert_eq!(count, 3072);
    println!("exactly representable physical admission cases={count}");
}

#[test]
fn native_float_storage_matrix_tracks_admission_and_free_motion_drift() {
    use absolutejs_rigid_midpoint_reference::midpoint::{
        bounded_midpoint_step, rigid_rotation_step,
    };
    let mut seed = 0xcab13988_u64;
    let mut random = || {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        ((seed >> 11) as f64) / (1u64 << 53) as f64
    };
    let mut accepted = 0;
    let mut rejected = 0;
    let mut max_energy = 0.0_f64;
    let mut max_momentum = 0.0_f64;
    for _ in 0..500 {
        let covariance = [
            10.0_f64.powf(-12.0 * random()),
            10.0_f64.powf(-12.0 * random()),
            1.0,
        ];
        let base = [
            covariance[1] + covariance[2],
            covariance[0] + covariance[2],
            covariance[0] + covariance[1],
        ];
        let initial_w = [
            random() * 2.0 - 1.0,
            random() * 2.0 - 1.0,
            random() * 2.0 - 1.0,
        ]
        .map(|x| x as f32 as f64);
        for scale in [1e-10, 1.0, 1e10] {
            let moments = base.map(|i| (i * scale) as f32 as f64);
            let j0: V = core::array::from_fn(|i| moments[i] * initial_w[i]);
            match bounded_midpoint_step(j0, moments, 1.0 / 240.0, core::f64::consts::FRAC_PI_4) {
                Err(MidpointError::NonPhysicalInertia) => {
                    rejected += 1;
                    continue;
                }
                Err(error) => panic!("unexpected admission error: {error:?}"),
                Ok(_) => accepted += 1,
            }
            let inverse = moments.map(|i| 1.0 / i);
            let e0 = energy(j0, inverse);
            let identity = [0., 0., 0., 1.];
            let mut q = identity;
            let mut w = initial_w;
            for _ in 0..240 {
                let step = rigid_rotation_step(q, identity, moments, w, 1.0 / 240.0).unwrap();
                q = step.rotation.map(|x| x as f32 as f64);
                w = step.angular_velocity.map(|x| x as f32 as f64);
                // Normalize the stored quaternion when measuring physical attitude.
                let attitude = multiply(identity, q);
                let omega = rotate([-attitude[0], -attitude[1], -attitude[2], attitude[3]], w);
                let j = core::array::from_fn(|i| moments[i] * omega[i]);
                let l = rotate(attitude, j);
                max_energy = max_energy.max((energy(j, inverse) / e0 - 1.0).abs());
                max_momentum =
                    max_momentum.max(norm(core::array::from_fn(|i| l[i] - j0[i])) / norm(j0));
            }
        }
    }
    println!("native f32 matrix: admitted={accepted}, rejected nonphysical stored moments={rejected}, checked states={}, max relative energy={max_energy:e}, momentum={max_momentum:e}", accepted*240);
    assert_eq!(accepted + rejected, 1500);
    assert!(accepted > 1000 && rejected > 0);
    assert!(max_energy < 1e-4);
    assert!(max_momentum < 1e-4);
}
