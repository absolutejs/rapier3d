# Candidate 5: prescribed kinematic trajectories

Private, unreleased solver research. Fast velocity/position-driven kinematics now
trigger CCD subdivisions against full-CCD dynamic targets without clamping their
prescribed path. Position-based trajectories retain the outer-step target through
subdivisions. Merged final time intervals now clear remaining_time before computing
that path endpoint.

Twelve three-step kinematic cases preserve endpoints; awake-target crossings are
fixed at caps 4 and 16. Four sleeping-target multi-pass cases still cross. Cap 1
remains an explicit limitation. Six unrelated-impact translation/rotation cases,
including offset centers of mass, preserve requested endpoints. Five sleeping
filter controls isolate the failure to solid impact; pseudo/excluded targets remain
stationary and asleep. Strict TypeScript checks pass for all three new probes.

All 135 sphere cases retain zero crossings/energy gains and the existing frame-error
limits. Sensor/filter controls pass. The unmodified package suite reports 11 pass,
2 existing numerical upstream-parity failures, 47,258 assertions. An earlier run
contended with compilation and hit a time budget; that result is retained separately
under candidate-5a, not hidden by changing the bound.

Remaining work: earliest-hit wake timing, cap-one physics, existing cavity overlap,
rotation/shape/scale variation, cost bounds, and full production qualification.
No installed game dependency or npm release changed.
