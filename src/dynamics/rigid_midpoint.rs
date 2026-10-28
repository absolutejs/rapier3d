//! Matched torque-free principal-frame momentum integration.
//!
//! Used by the admitted isolated-body solver path. A matching Cayley attitude
//! increment is part of the result; applying only the momentum update does not
//! preserve the world-space angular-momentum vector. No conservation clamp is used.

type Vector = [f64; 3];
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MidpointError {
    InvalidInput,
    NonFinite,
    SingularJacobian,
    IterationBudget,
    NonPhysicalInertia,
    RotationLimit,
}
#[derive(Clone, Copy, Debug)]
pub struct MidpointStep {
    pub momentum: Vector,
    /// Right-multiply the principal-frame attitude by this x/y/z/w quaternion.
    pub rotation_increment: [f64; 4],
    pub iterations: usize,
    /// Euclidean residual of the angular-velocity equation, in radians/second.
    pub residual: f64,
}
fn cross(a: Vector, b: Vector) -> Vector {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}
fn norm(a: Vector) -> f64 {
    num_traits::Float::sqrt(a.iter().map(|x| x * x).sum())
}
fn solve(mut a: [[f64; 4]; 3]) -> Result<Vector, MidpointError> {
    let magnitude = a
        .iter()
        .flat_map(|row| row[..3].iter())
        .fold(0.0_f64, |m, x| m.max(x.abs()));
    for column in 0..3 {
        let mut pivot = column;
        for row in column + 1..3 {
            if a[row][column].abs() > a[pivot][column].abs() {
                pivot = row;
            }
        }
        if !a[pivot][column].is_finite() {
            return Err(MidpointError::NonFinite);
        }
        if a[pivot][column].abs() <= f64::EPSILON * magnitude {
            return Err(MidpointError::SingularJacobian);
        }
        a.swap(column, pivot);
        let divisor = a[column][column];
        for k in column..4 {
            a[column][k] /= divisor;
        }
        for row in 0..3 {
            if row != column {
                let factor = a[row][column];
                for k in column..4 {
                    a[row][k] -= factor * a[column][k];
                }
            }
        }
    }
    let value = [a[0][3], a[1][3], a[2][3]];
    if value.iter().all(|v| v.is_finite()) {
        Ok(value)
    } else {
        Err(MidpointError::NonFinite)
    }
}
/// Bounded implicit midpoint solve in a principal-inertia frame.
/// Positive inverse moments are required; locked axes need a different model.
/// Negative dt is supported for reversibility tests. Failure returns no partial state.
pub fn midpoint_step(
    momentum: Vector,
    inverse: Vector,
    dt: f64,
) -> Result<MidpointStep, MidpointError> {
    if !dt.is_finite()
        || dt == 0.0
        || !momentum.iter().all(|x| x.is_finite())
        || !inverse.iter().all(|x| x.is_finite() && *x > 0.0)
    {
        return Err(MidpointError::InvalidInput);
    }
    midpoint_step_principal(momentum, inverse.map(|i| 1.0 / i), dt)
}

/// Principal-moment entry point avoids reconstructing moments from rounded
/// reciprocals. Positive moments need not form a physical inertia tensor;
/// admission to a physical engine must separately enforce that requirement.
pub fn midpoint_step_principal(
    momentum: Vector,
    principal: Vector,
    dt: f64,
) -> Result<MidpointStep, MidpointError> {
    if !dt.is_finite()
        || dt == 0.0
        || !momentum.iter().all(|x| x.is_finite())
        || !principal.iter().all(|x| x.is_finite() && *x > 0.0)
    {
        return Err(MidpointError::InvalidInput);
    }
    let inverse = principal.map(|i| 1.0 / i);
    // Precondition in angular velocity rather than momentum. For physical
    // inertia, |I_j-I_k| <= I_i bounds each Euler coefficient by one, even
    // when one moment is tiny. A momentum Jacobian instead contains ratios
    // of principal moments that can spuriously trip a singularity threshold.
    let initial: Vector = core::array::from_fn(|i| momentum[i] * inverse[i]);
    let coefficients = [
        (principal[1] - principal[2]) * inverse[0],
        (principal[2] - principal[0]) * inverse[1],
        (principal[0] - principal[1]) * inverse[2],
    ];
    let magnitude = norm(initial);
    if !magnitude.is_finite() || !coefficients.iter().all(|c| c.is_finite()) {
        return Err(MidpointError::NonFinite);
    }
    let tolerance = 64.0 * f64::EPSILON * magnitude.max(f64::MIN_POSITIVE);
    let mut next = initial;
    for iterations in 0..=16 {
        let omega: Vector = core::array::from_fn(|i| (initial[i] + next[i]) * 0.5);
        let f: Vector = core::array::from_fn(|i| {
            next[i] - initial[i] - dt * coefficients[i] * omega[(i + 1) % 3] * omega[(i + 2) % 3]
        });
        let residual = norm(f);
        if !residual.is_finite() {
            return Err(MidpointError::NonFinite);
        }
        if residual <= tolerance {
            let mut q = [
                dt * omega[0] * 0.5,
                dt * omega[1] * 0.5,
                dt * omega[2] * 0.5,
                1.0,
            ];
            let length = num_traits::Float::sqrt(q.iter().map(|x| x * x).sum::<f64>());
            if !length.is_finite() {
                return Err(MidpointError::NonFinite);
            }
            for v in &mut q {
                *v /= length;
            }
            // Apply only the increment, preserving exact zero-change momentum.
            let momentum =
                core::array::from_fn(|i| momentum[i] + (next[i] - initial[i]) / inverse[i]);
            if !momentum.iter().all(|j| j.is_finite()) {
                return Err(MidpointError::NonFinite);
            }
            return Ok(MidpointStep {
                momentum,
                rotation_increment: q,
                iterations,
                residual,
            });
        }
        if iterations == 16 {
            return Err(MidpointError::IterationBudget);
        }
        let mut jacobian = [[0.0; 4]; 3];
        for row in 0..3 {
            let j = (row + 1) % 3;
            let k = (row + 2) % 3;
            jacobian[row][row] = 1.0;
            jacobian[row][j] = -dt * 0.5 * coefficients[row] * omega[k];
            jacobian[row][k] = -dt * 0.5 * coefficients[row] * omega[j];
            jacobian[row][3] = -f[row];
        }
        let delta = solve(jacobian)?;
        for i in 0..3 {
            next[i] += delta[i];
        }
    }
    Err(MidpointError::IterationBudget)
}

#[derive(Clone, Copy, Debug)]
pub struct RigidRotationStep {
    pub rotation: [f64; 4],
    pub angular_velocity: Vector,
    pub iterations: usize,
    /// Euclidean residual of the angular-velocity equation, in radians/second.
    pub residual: f64,
}
fn normalized(mut q: [f64; 4]) -> Result<[f64; 4], MidpointError> {
    let length = num_traits::Float::sqrt(q.iter().map(|x| x * x).sum::<f64>());
    if !length.is_finite() || length == 0.0 {
        return Err(MidpointError::InvalidInput);
    }
    for value in &mut q {
        *value /= length;
    }
    Ok(q)
}
fn conjugate(q: [f64; 4]) -> [f64; 4] {
    [-q[0], -q[1], -q[2], q[3]]
}
fn multiply(a: [f64; 4], b: [f64; 4]) -> [f64; 4] {
    [
        a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
        a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
        a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
        a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ]
}
fn rotate(q: [f64; 4], v: Vector) -> Vector {
    let u = [q[0], q[1], q[2]];
    let twice = cross(u, v).map(|x| 2.0 * x);
    let second = cross(u, twice);
    core::array::from_fn(|i| v[i] + q[3] * twice[i] + second[i])
}
/// Convert body/principal frames consistently around the matched rotation step.
/// The inverse is derived in f64 from the SAME supplied principal moments.
/// Combining rounded f32 moments with separately rounded inverse moments would
/// reintroduce the artificial zero-torque spin-up removed from the native engine.
/// This is still a free rigid-motion candidate, not a constrained-body update.
pub fn rigid_rotation_step(
    rotation: [f64; 4],
    principal_frame: [f64; 4],
    principal: Vector,
    angular_velocity: Vector,
    dt: f64,
) -> Result<RigidRotationStep, MidpointError> {
    rigid_rotation_step_inner(
        rotation,
        principal_frame,
        principal,
        angular_velocity,
        dt,
        None,
    )
}

/// Native admission boundary; accepts only a physical stored tensor and
/// a matched attitude increment within the caller's substep rotation allowance.
pub fn bounded_rigid_rotation_step(
    rotation: [f64; 4],
    principal_frame: [f64; 4],
    principal: Vector,
    angular_velocity: Vector,
    dt: f64,
    maximum_angle: f64,
) -> Result<RigidRotationStep, MidpointError> {
    rigid_rotation_step_inner(
        rotation,
        principal_frame,
        principal,
        angular_velocity,
        dt,
        Some(maximum_angle),
    )
}

fn rigid_rotation_step_inner(
    rotation: [f64; 4],
    principal_frame: [f64; 4],
    principal: Vector,
    angular_velocity: Vector,
    dt: f64,
    maximum_angle: Option<f64>,
) -> Result<RigidRotationStep, MidpointError> {
    if !principal.iter().all(|i| i.is_finite() && *i > 0.0)
        || !angular_velocity.iter().all(|w| w.is_finite())
    {
        return Err(MidpointError::InvalidInput);
    }
    let rotation = normalized(rotation)?;
    let frame = normalized(principal_frame)?;
    let principal_rotation = normalized(multiply(rotation, frame))?;
    let omega = rotate(conjugate(principal_rotation), angular_velocity);
    let inverse = principal.map(|i| 1.0 / i);
    let j = core::array::from_fn(|i| principal[i] * omega[i]);
    let result = match maximum_angle {
        Some(cap) => bounded_midpoint_step(j, principal, dt, cap)?,
        None => midpoint_step_principal(j, principal, dt)?,
    };
    let next_principal_rotation =
        normalized(multiply(principal_rotation, result.rotation_increment))?;
    let next_omega = core::array::from_fn(|i| result.momentum[i] * inverse[i]);
    let before = rotate(principal_rotation, omega);
    let after = rotate(next_principal_rotation, next_omega);
    // Preserve the incoming world velocity when the calculated change rounds to
    // zero, rather than reconstructing and repeatedly rounding the entire value.
    let angular_velocity = core::array::from_fn(|i| angular_velocity[i] + (after[i] - before[i]));
    if !angular_velocity.iter().all(|x| x.is_finite()) {
        return Err(MidpointError::NonFinite);
    }
    Ok(RigidRotationStep {
        rotation: normalized(multiply(next_principal_rotation, conjugate(frame)))?,
        angular_velocity,
        iterations: result.iterations,
        residual: result.residual,
    })
}

/// Admission boundary for torque-free engine integration.
/// Rejects nonphysical stored inertia and an excessive ACTUAL Cayley angle.
/// It never rescales velocity or returns a partially updated state. The caller
/// must decide how rejected cases participate in the full constrained solver.
pub fn bounded_midpoint_step(
    momentum: Vector,
    principal: Vector,
    dt: f64,
    maximum_angle: f64,
) -> Result<MidpointStep, MidpointError> {
    if !maximum_angle.is_finite()
        || maximum_angle <= 0.0
        || maximum_angle >= core::f64::consts::PI
        || !principal.iter().all(|x| x.is_finite() && *x > 0.0)
    {
        return Err(MidpointError::InvalidInput);
    }
    // Subtraction avoids overflow in I_j + I_k. No relative tolerance is
    // allowed here: an epsilon-sized absolute discrepancy can exceed the
    // smallest moment of a very thin body by orders of magnitude.
    for i in 0..3 {
        if (principal[(i + 1) % 3] - principal[(i + 2) % 3]).abs() > principal[i] {
            return Err(MidpointError::NonPhysicalInertia);
        }
    }
    let result = midpoint_step_principal(momentum, principal, dt)?;
    let q = result.rotation_increment;
    let angle = 2.0 * num_traits::Float::atan2(norm([q[0], q[1], q[2]]), q[3].abs());
    if angle > maximum_angle {
        return Err(MidpointError::RotationLimit);
    }
    Ok(result)
}
