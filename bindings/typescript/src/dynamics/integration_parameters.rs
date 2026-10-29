use crate::dynamics::RawSoftRecoverySettings;
use rapier::dynamics::IntegrationParameters;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct RawIntegrationParameters(pub(crate) IntegrationParameters);

#[wasm_bindgen]
impl RawIntegrationParameters {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        RawIntegrationParameters(IntegrationParameters::default())
    }

    /// Existing native spring settings; static contacts have their own coefficients.
    pub fn contactNaturalFrequency(&self, fixed: bool) -> f32 {
        if fixed { self.0.static_contact_softness.natural_frequency }
        else { self.0.contact_softness.natural_frequency }
    }

    pub fn contactDampingRatio(&self, fixed: bool) -> f32 {
        if fixed { self.0.static_contact_softness.damping_ratio }
        else { self.0.contact_softness.damping_ratio }
    }

    /// Validate both values before changing either coefficient.
    pub fn setContactSoftness(&mut self, fixed: bool, frequency: f32, damping: f32) -> Result<(), JsError> {
        if !frequency.is_finite() || frequency <= 0.0
            || !(frequency * core::f32::consts::TAU).is_finite()
            || !damping.is_finite() || damping < 0.0 || !(damping * 2.0).is_finite() {
            return Err(JsError::new("Contact softness needs a positive finite f32 frequency and nonnegative finite f32 damping ratio"));
        }
        let settings = if fixed { &mut self.0.static_contact_softness }
            else { &mut self.0.contact_softness };
        settings.natural_frequency = frequency;
        settings.damping_ratio = damping;
        Ok(())
    }

    #[wasm_bindgen(getter)]
    pub fn contactClustering(&self) -> bool {
        self.0.contact_clustering
    }

    #[wasm_bindgen(setter)]
    pub fn set_contactClustering(&mut self, value: bool) {
        self.0.contact_clustering = value;
    }

    #[wasm_bindgen(getter)]
    pub fn contactRecycling(&self) -> bool { self.0.contact_recycling }

    #[wasm_bindgen(setter)]
    pub fn set_contactRecycling(&mut self, value: bool) { self.0.contact_recycling = value; }

    #[wasm_bindgen(getter)]
    pub fn normalizedContactRecycleDistance(&self) -> f32 { self.0.normalized_contact_recycle_distance }

    #[wasm_bindgen(setter)]
    pub fn set_normalizedContactRecycleDistance(&mut self, value: f32) { self.0.normalized_contact_recycle_distance = value; }

    #[wasm_bindgen(getter)]
    pub fn warmstartCoefficient(&self) -> f32 { self.0.warmstart_coefficient }

    #[wasm_bindgen(setter)]
    pub fn set_warmstartCoefficient(&mut self, value: f32) { self.0.warmstart_coefficient = value; }

    #[wasm_bindgen(getter)]
    pub fn minCcdDt(&self) -> f32 {
        self.0.min_ccd_dt
    }

    #[wasm_bindgen(setter)]
    pub fn set_minCcdDt(&mut self, value: f32) {
        self.0.min_ccd_dt = value;
    }

    #[wasm_bindgen(getter)]
    pub fn dt(&self) -> f32 {
        self.0.dt
    }

    #[wasm_bindgen(getter)]
    pub fn contact_erp(&self) -> f32 {
        self.0.contact_softness.erp(self.0.dt)
    }

    #[wasm_bindgen(getter)]
    pub fn normalizedAllowedLinearError(&self) -> f32 {
        self.0.normalized_allowed_linear_error
    }

    #[wasm_bindgen(getter)]
    pub fn normalizedPredictionDistance(&self) -> f32 {
        self.0.normalized_prediction_distance
    }

    #[wasm_bindgen(getter)]
    pub fn numSolverIterations(&self) -> usize {
        self.0.num_solver_iterations
    }

    #[wasm_bindgen(getter)]
    pub fn numInternalPgsIterations(&self) -> usize {
        self.0.num_internal_pgs_iterations
    }

    #[wasm_bindgen(getter)]
    pub fn maxCcdSubsteps(&self) -> usize {
        self.0.max_ccd_substeps
    }

    #[wasm_bindgen(getter)]
    pub fn lengthUnit(&self) -> f32 {
        self.0.length_unit
    }

    #[wasm_bindgen(getter)]
    pub fn softBodiesResweepStrain(&self) -> f32 {
        self.0.soft_bodies.resweep_strain
    }

    #[wasm_bindgen(setter)]
    pub fn set_softBodiesResweepStrain(&mut self, value: f32) {
        self.0.soft_bodies.resweep_strain = value;
    }

    #[wasm_bindgen(getter)]
    pub fn softBodiesMaxExtraSubsteps(&self) -> usize {
        self.0.soft_bodies.max_extra_substeps
    }

    #[wasm_bindgen(setter)]
    pub fn set_softBodiesMaxExtraSubsteps(&mut self, value: usize) {
        self.0.soft_bodies.max_extra_substeps = value;
    }

    #[wasm_bindgen(getter)]
    pub fn softBodiesContactStiffening(&self) -> f32 {
        self.0.soft_bodies.contact_stiffening
    }

    #[wasm_bindgen(setter)]
    pub fn set_softBodiesContactStiffening(&mut self, value: f32) {
        self.0.soft_bodies.contact_stiffening = value;
    }

    #[wasm_bindgen(getter)]
    pub fn softBodiesRecovery(&self) -> RawSoftRecoverySettings {
        RawSoftRecoverySettings(self.0.soft_bodies.recovery)
    }

    #[wasm_bindgen(setter)]
    pub fn set_softBodiesRecovery(&mut self, value: &RawSoftRecoverySettings) {
        self.0.soft_bodies.recovery = value.0;
    }

    #[wasm_bindgen(getter)]
    pub fn softBodiesFemLinearTolerance(&self) -> f32 {
        self.0.soft_bodies.fem.linear_tolerance
    }

    #[wasm_bindgen(setter)]
    pub fn set_softBodiesFemLinearTolerance(&mut self, value: f32) {
        self.0.soft_bodies.fem.linear_tolerance = value;
    }

    #[wasm_bindgen(getter)]
    pub fn softBodiesFemMaxLinearIterations(&self) -> usize {
        self.0.soft_bodies.fem.max_linear_iterations
    }

    #[wasm_bindgen(setter)]
    pub fn set_softBodiesFemMaxLinearIterations(&mut self, value: usize) {
        self.0.soft_bodies.fem.max_linear_iterations = value;
    }

    #[wasm_bindgen(getter)]
    pub fn softBodiesFemMaxDenseDofs(&self) -> usize {
        self.0.soft_bodies.fem.max_dense_dofs
    }

    #[wasm_bindgen(setter)]
    pub fn set_softBodiesFemMaxDenseDofs(&mut self, value: usize) {
        self.0.soft_bodies.fem.max_dense_dofs = value;
    }

    #[wasm_bindgen(setter)]
    pub fn set_dt(&mut self, value: f32) {
        self.0.dt = value;
    }

    #[wasm_bindgen(setter)]
    pub fn set_contact_natural_frequency(&mut self, value: f32) {
        self.0.contact_softness.natural_frequency = value
    }

    #[wasm_bindgen(setter)]
    pub fn set_normalizedAllowedLinearError(&mut self, value: f32) {
        self.0.normalized_allowed_linear_error = value
    }

    #[wasm_bindgen(setter)]
    pub fn set_normalizedPredictionDistance(&mut self, value: f32) {
        self.0.normalized_prediction_distance = value
    }

    #[wasm_bindgen(setter)]
    pub fn set_numSolverIterations(&mut self, value: usize) {
        self.0.num_solver_iterations = value;
    }
    #[wasm_bindgen(setter)]
    pub fn set_numInternalPgsIterations(&mut self, value: usize) {
        self.0.num_internal_pgs_iterations = value;
    }

    #[wasm_bindgen(setter)]
    pub fn set_maxCcdSubsteps(&mut self, value: usize) {
        self.0.max_ccd_substeps = value
    }

    #[wasm_bindgen(setter)]
    pub fn set_lengthUnit(&mut self, value: f32) {
        self.0.length_unit = value
    }
}
