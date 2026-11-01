# Private solver schedule observations

This feature branch starts at the queued 0.19.0 source 34984c9. Native force controls established that held-force timing depends on prepared solve-group substeps, including additional iterations inherited through connected bodies. A global configured count alone does not describe those groups.

The candidate records nonempty rigid-body group passes, rigid-body visits, body-substep visits and min/max substep count/duration. Counts aggregate across CCD passes and reset per outer step. They do not identify unique bodies, PGS sweeps, actual CPU time, soft-body-only work or the next step's schedule. The raw/public API is owned and only available after a completed profiled step. No group, force, contact, timestep or iteration policy changes.

This is private 0.20.0-research.0 with an intentionally unqualified zero native identity. Native build, package/browser checks, physical parity, sampled cost and independent build qualification are pending. The native identity must be recorded explicitly for private tests using the established research-only workflow; the stable release guard remains enabled. This is not in the publication queue and must not replace the qualified 0.19.0 archive yet.
