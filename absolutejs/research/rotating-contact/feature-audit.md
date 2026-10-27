# Saved trajectory feature audit

`analyze-features.py` classifies the closest box feature independently in box-local coordinates, then verifies every reconstructed signed distance against the saved analytic sphere/box oracle. Seven analytic classification controls include faces, edge, corner, interior and a rotated face. Input and analyzer hashes are recorded; no solver is executed or modified.

`candidate-16-feature-audit.json` uses the bounded refresh-1 trajectories (at most 1.5 radians), not the exploratory full-duration face-edge file. Broad-face forward-order penetration persists at 60, 240 and 960Hz with omega=6 and 30rad/s. At the recorded broad-face peaks, the projected center is at least 0.5m from every edge, five sphere radii. This rules out an edge/corner transition as a necessary explanation for these failures. It does not identify the internal solver cause or establish equivalence with chip/cavity residuals.

The reported normal angle is an outer-step manifold observation, not a within-solver trace. Feature classification describes the current geometry; it does not reconstruct the feature selected by the cached contact manifold. Next work should inspect a broad-face-only rotating-support constraint with consistent normal transport, derivative, and bias before extending to general contact features.
