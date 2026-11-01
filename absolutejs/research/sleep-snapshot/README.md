# Read-only native sleep-state inspection

A standalone host Rust inspector decodes the exact versioned WASM snapshot
schema with the same Rapier source, Parry pin and serialization/FEM features.
It requires byte-for-byte reserialization of the complete payload before
reporting any state. It never steps or changes the captured world. This is a
research tool, not a shipped API or a cross-platform trajectory guarantee.

All six captured snapshots round-trip exactly. Repeated reads reproduce the
same JSON without changing input bytes. Wrong magic, wrong version and a
truncated payload are rejected. `verification.json` records the binary/source/
lockfile and snapshot hashes; `verify.py` reproduces these controls.

| Capture | First component timer | Second component |
| --- | --- | --- |
| variant6,960Hz,20s | 0.003125s | asleep |
| variant6,960Hz,60s | 0.005208s | asleep |
| variant7,960Hz,20s | 0.007292s | asleep |
| variant7,960Hz,60s | 0.323959s | asleep |
| variant6,1920Hz,20s | 0.005208s | asleep |
| variant6,1920Hz,36.4667s | asleep | asleep |

The required quiet period is0.5s. The first components' native maximum extents
are35.2512cm and38.2689cm respectively. Their0.05normalized linear threshold
is scaled by the100solver-units/metre setting. Native dynamic sleep eligibility
uses actual pose drift across the body's extent; low center velocity alone does
not establish eligibility. These terminal snapshots do not identify every
intervening timer reset or prove that contact jitter is physically correct.

The audit's old `not-sleeping` reason applied the shared world time limit to
every body. Native state and the original public `sleeping` field agree that the
second body was already asleep. The game research runner now distinguishes
`run-incomplete` from `not-sleeping`; historical receipts remain unmodified.

Build with one job and the pinned offline Cargo cache:
`cargo build --manifest-path absolutejs/research/sleep-snapshot/Cargo.toml`.
Then run the binary with a captured `.bin` path and `python3 .../verify.py`.
The schema is tied to this native source; the tool deliberately rejects a
payload that cannot reproduce exactly. No npm release is needed for this tool.
