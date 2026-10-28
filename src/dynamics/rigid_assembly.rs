//! Private force-free fixed-assembly integration experiment.
use crate::dynamics::rigid_midpoint::{
    bounded_rigid_rotation_step, cross, normalized, rotate, MidpointError,
};
use crate::dynamics::RigidBodyVelocity;
use crate::math::{Pose, Real, Rotation, Vector};
use parry::mass_properties::MassProperties;
type V = [f64; 3];

/// Rebuilt once per island solve from authored relative frames and actual input
/// generalized velocities. Never serialized or reconstructed from a rounded kick.
pub(crate) struct FreeAssemblyState {
    center_local: V,
    root_com: V,
    center_world: V,
    velocity: V,
    rotation: [f64; 4],
    angular_velocity: V,
    principal: V,
    principal_frame: [f64; 4],
}
pub(crate) struct FreeAssemblyStep {
    pub pose: Pose,
    pub velocity: RigidBodyVelocity<Real>,
}
impl FreeAssemblyState {
    pub fn new(
        props: MassProperties,
        root_com: Vector,
        pose: Pose,
        velocity: RigidBodyVelocity<Real>,
    ) -> Option<Self> {
        let rotation = normalized(pose.rotation.to_array().map(|x| x as f64)).ok()?;
        let principal_frame = normalized(
            props
                .principal_inertia_local_frame
                .to_array()
                .map(|x| x as f64),
        )
        .ok()?;
        let center_local = props.local_com.to_array().map(|x| x as f64);
        let root_com = root_com.to_array().map(|x| x as f64);
        let angular_velocity = velocity.angvel.to_array().map(|x| x as f64);
        let offset = rotate(
            rotation,
            core::array::from_fn(|i| center_local[i] - root_com[i]),
        );
        let angular_shift = cross(angular_velocity, offset);
        let center_shift = rotate(rotation, center_local);
        let center_world = core::array::from_fn(|i| pose.translation[i] as f64 + center_shift[i]);
        let velocity = core::array::from_fn(|i| velocity.linvel[i] as f64 + angular_shift[i]);
        let result = Self {
            center_local,
            root_com,
            center_world,
            velocity,
            rotation,
            angular_velocity,
            principal: props.principal_inertia().to_array().map(|x| x as f64),
            principal_frame,
        };
        if result
            .center_world
            .iter()
            .chain(result.velocity.iter())
            .chain(result.principal.iter())
            .all(|x| x.is_finite())
        {
            Some(result)
        } else {
            None
        }
    }
    /// No cached or physical state is changed unless the whole result is finite,
    /// representable in native storage, and admitted by the angular bound.
    pub fn advance(
        &mut self,
        dt: f64,
        maximum_angle: f64,
        maximum_speed: f64,
    ) -> Result<FreeAssemblyStep, MidpointError> {
        let speed = |v: V| v.iter().map(|x| x * x).sum::<f64>().sqrt();
        if speed(self.angular_velocity) > maximum_speed {
            return Err(MidpointError::RotationLimit);
        }
        let next = bounded_rigid_rotation_step(
            self.rotation,
            self.principal_frame,
            self.principal,
            self.angular_velocity,
            dt,
            maximum_angle,
        )?;
        if speed(next.angular_velocity) > maximum_speed {
            return Err(MidpointError::RotationLimit);
        }
        let center: V = core::array::from_fn(|i| self.center_world[i] + dt * self.velocity[i]);
        let offset = rotate(next.rotation, self.center_local);
        let root_offset = rotate(
            next.rotation,
            core::array::from_fn(|i| self.root_com[i] - self.center_local[i]),
        );
        let angular_shift = cross(next.angular_velocity, root_offset);
        let position =
            Vector::from_array(core::array::from_fn(|i| (center[i] - offset[i]) as Real));
        let linear = Vector::from_array(core::array::from_fn(|i| {
            (self.velocity[i] + angular_shift[i]) as Real
        }));
        let angular = Vector::from_array(next.angular_velocity.map(|x| x as Real));
        let rotation = next.rotation.map(|x| x as Real);
        if !position.is_finite()
            || !linear.is_finite()
            || !angular.is_finite()
            || !rotation.iter().all(|x| x.is_finite())
        {
            return Err(MidpointError::NonFinite);
        }
        self.center_world = center;
        self.rotation = next.rotation;
        self.angular_velocity = next.angular_velocity;
        Ok(FreeAssemblyStep {
            pose: Pose::from_parts(position, Rotation::from_array(rotation)),
            velocity: RigidBodyVelocity {
                linvel: linear,
                angvel: angular,
            },
        })
    }
}
