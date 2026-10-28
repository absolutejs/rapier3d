//! Private candidate for torque-free principal-frame momentum integration.
//!
//! This module is not yet wired into the engine. A matching Cayley attitude
//! increment is part of the result; applying only the momentum update does not
//! preserve the world-space angular-momentum vector. No conservation clamp is used.

type Vector = [f64; 3];
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MidpointError {
    InvalidInput,
    NonFinite,
    SingularJacobian,
    IterationBudget,
}
#[derive(Clone, Copy, Debug)]
pub struct MidpointStep {
    pub momentum: Vector,
    /// Right-multiply the principal-frame attitude by this x/y/z/w quaternion.
    pub rotation_increment: [f64; 4],
    pub iterations: usize,
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
    let magnitude = norm(momentum);
    if !magnitude.is_finite() {
        return Err(MidpointError::NonFinite);
    }
    let tolerance = 64.0 * f64::EPSILON * magnitude.max(f64::MIN_POSITIVE);
    let mut next = momentum;
    for iterations in 0..=16 {
        let middle = core::array::from_fn(|i| (momentum[i] + next[i]) * 0.5);
        let omega = core::array::from_fn(|i| middle[i] * inverse[i]);
        let torque = cross(middle, omega);
        let f = core::array::from_fn(|i| next[i] - momentum[i] - dt * torque[i]);
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
            return Ok(MidpointStep {
                momentum: next,
                rotation_increment: q,
                iterations,
                residual,
            });
        }
        if iterations == 16 {
            return Err(MidpointError::IterationBudget);
        }
        let mut jacobian = [[0.0; 4]; 3];
        for column in 0..3 {
            let mut axis = [0.0; 3];
            axis[column] = 1.0;
            let mut response = [0.0; 3];
            response[column] = inverse[column];
            let first = cross(axis, omega);
            let second = cross(middle, response);
            for row in 0..3 {
                jacobian[row][column] =
                    (if row == column { 1.0 } else { 0.0 }) - dt * 0.5 * (first[row] + second[row]);
            }
        }
        for row in 0..3 {
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
    let result = midpoint_step(j, inverse, dt)?;
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
