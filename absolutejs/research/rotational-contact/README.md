# Private rotational/contact combination

Base engine: dd8ad68, the blocked pure rotational candidate. This separate
checkout adds only support-bound-associated GJK directions to the interval
sweep algorithm. No persistent triangle-frame or composite-bound changes.

The old `rotational-sweep/` evidence belongs to the pure candidate, not this
combination. New evidence lives here. The zero native identity intentionally
prevents packaging an unbuilt candidate. Canonical game stays on 0.16.3.

First gates: seeded oak query; original sweep matrix/control suite and four
native configurations; captured step and full oak excavation in WASM; then
24 paired tree cases and full-game validation. No thresholds are relaxed.

Parry pinned to native-tested `8c68a625c15930ca8b685f30861aedf5d59c3726`.
The first locked fetch correctly rejected a missed explicit binding-manifest
pin. After updating that manifest, an exact parsed lock comparison confirms
only the intended Parry source revision changes. Failed fetch logs retained.
Native build uses the immutable source workspace recorded in source-path.txt,
offline Cargo and one compiler job. Package results still pending.

Private native build completes in 3m29s. All 236 package tests pass with
86,879 assertions, and the bounded GPU-disabled browser check passes. Its
first sandboxed server attempt failed EPERM; the authorized localhost run
succeeded. Pack audit verifies 49 distribution files. Native SHA-256
`0dad2a033f7d46e262a08a370429dc6e23ea95009f824c14a76302a15a8f73a8`,
3,362,690 bytes. Archive SHA-256
`5369db8fc7f2243d629586c3eff2b27d875b8dd4d700ee54e5b9e3519d3598c4`.
Game install matches all 53 archive files. Game qualification is pending.

Permanent saved-world regression passes in the candidate and fails in published
0.16.3 at the exact old -20.19365119934082 cm depth. The complete package suite
now passes 237 tests (86,885 assertions). Native support scale/order/replay
controls pass in one-worker and two-worker configurations (three tests each);
allocation-enabled native no-std check passes. Source fixtures preserve the
original input bytes and hash. Cost and independent-build gates remain.

Paired CPU evidence preserves both original four-warmup/eight-sample runs and
a twelve-warmup/twelve-sample follow-up prompted by visible warmup drift.
The follow-up control ratios are 0.960, 0.936 and 0.988 with exact physical
results. They are timing observations, not a speedup claim. The tilted support
patch changes physical results and costs 1.510x baseline (14.143 versus 9.364 ms
per 128 restored steps, about 0.0373 ms extra per step). Original patch ratio
was 1.635x. Both reports are retained; there is no claim that corrected sweeps
are free. The rare interior-crossing native fixture also costs more because
the old query incorrectly skips the collision. Query cap stays 25; translating
sweeps retain their original algorithm. This is not a browser FPS benchmark.

Source audit confirms no engine/binding Rust edits beyond published 0.16.3;
the pinned collision library contains the interval sweeps, GJK direction fix,
f64 bounds feature and test-only lint/import changes. No frame or composite
bounds experiments are present. Independent rebuild is underway.

Independent clean-target build completes in 3m30s. All 49 distribution files
and packaged WASM match exactly. Raw executable/data sections match; only the
unshipped wasm-bindgen custom metadata differs. Input manifests match exactly.
See reproducibility.json. Public promotion is now eligible, subject to public
archive equivalence and focused identity/browser checks.
