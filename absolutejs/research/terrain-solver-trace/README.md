# Diagnostic-only terrain solver reduction

This branch is NOT release source. It starts from the blocked duplicate-CSO
candidate 3c54609 and replays identical saved states natively to distinguish
contact selection, cached impulses, friction model and iterative solving.
Native replay is not assumed byte-identical to WASM. No settings are adopted.
A fresh checkout-owned target and one compiler job are required.

Native saved-state replay roughly reproduces WASM default penetration, but
initial-state native variant 0 follows a different trajectory and passes;
therefore native results are diagnostics, not game qualification. Static
softness 600 Hz reduces saved-state penetration to ~0.971 mm. 1 MHz reduces it
to ~0.003 mm, but native full-fall variant 0 does not sleep within 20 seconds.
The 600 Hz native full falls sleep for both trees with sampled penetrations
~1.177 mm (variant 0) and ~0.007 mm (variant 5). No settings are adopted.

The controls/softness-controls JSON archives preserve per-step contact data.
The initial-variant archives sample complete native falls every 16 steps plus
first/final/sleeping steps; they are not continuous separation bounds. All are
losslessly gzip-compressed with hashes in evidence-archives.json. The game
research measure-native-controls.ts reads gzip directly, transforms captured
native proxy geometry by exported native poses and measures against canonical
terrain. Raw intermediate copies remain under .cache/terrain-solver-reports.

The first build received SIGTERM near the final executable compile, without an
identified source; build-interruption.json records observed memory/disk state.
The same-source retry completed in 17.62 s. Original and retry logs are retained.
