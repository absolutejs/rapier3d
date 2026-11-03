//! Opt-in research counters. Host workload diagnosis only; not a browser timing API.
use std::cell::Cell;
std::thread_local! { static COUNTS: Cell<[u64; 15]> = const { Cell::new([0; 15]) }; }
/// Clear this thread's bounded counters before one captured step.
pub fn reset() { COUNTS.with(|c| c.set([0;15])); }
/// Read scalar counters without holding world or collider references.
pub fn read() -> [u64;15] { COUNTS.with(Cell::get) }
pub(crate) fn add(index: usize, value: u64) {
 COUNTS.with(|c| {let mut counts=c.get();counts[index]=counts[index].saturating_add(value);c.set(counts);});
}
