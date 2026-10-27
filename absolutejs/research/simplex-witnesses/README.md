# Private native contact candidate

This candidate changes only the Parry collision dependency to the canonical, pushed AbsoluteJS source revision `dbd99a8dfce020da3698056471262435d56d3f69`. Engine and binding runtime source remain unchanged from stable 0.7.0. The rejected gyro increment correction is not included. `package.json` remains private until qualification.

Three tetrahedron-face assignments previously overwrote vertices needed by GJK's previous-simplex witness calculation. The canonical correction uses the existing swap helper, preserving the prior vertices and their indexing. Regression tests in `absolutejs/parry` pass for f32/f64, including all replaced face vertices. The exact tree capture and scale/depth sweep live in the game's `docs/physics-build-2026-10-27/` and are backed up remotely.

The engine and direct binding dependency both pin the same Git revision. The lock audit confirms that only Parry's source identity changes: package versions, dependency lists and all other lock entries remain identical. The first resolution attempt had an invalid cache symlink; the next temporarily exposed separate registry and git Parry identities. The final unified lock removes that duplication. Attempts are retained for diagnosis.

Builds use two jobs, a separate target directory, the canonical reproducible native-workspace preparation, and the existing stable path remapping. Do not reuse or overwrite the stable target. The candidate must replay the captured failure with unchanged decoding, pass original game contact gates and package diagnostics, and reproduce native bytes independently before any publish or game adoption.
