# Diagnostic-only terrain solver reduction

This branch is NOT release source. It starts from the blocked duplicate-CSO
candidate 3c54609 and replays identical saved states natively to distinguish
contact selection, cached impulses, friction model and iterative solving.
Native replay is not assumed byte-identical to WASM. No settings are adopted.
A fresh checkout-owned target and one compiler job are required.
