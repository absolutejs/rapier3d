//! Executes the actual solver helper without compiling unrelated engine features.
extern crate alloc;
mod alloc_prelude { pub use alloc::{vec, vec::Vec}; }
mod math { pub type Real = f32; }
#[path = "../../../src/dynamics/ccd/clamp_graph.rs"] mod clamp_graph;
use clamp_graph::coherent_fractions as solve;
#[test] fn includes_slow_dynamic_target() {
 assert_eq!(solve(&[((3,0),Some((2,0)),0.25)]),vec![((2,0),0.25),((3,0),0.25)]);
}
#[test] fn chains_are_coherent_and_order_independent() {
 let hits=[((1,0),Some((2,0)),0.75),((2,0),Some((3,0)),0.2)];
 let expected=vec![((1,0),0.2),((2,0),0.2),((3,0),0.2)];
 assert_eq!(solve(&hits),expected);assert_eq!(solve(&[hits[1],hits[0]]),expected);
}
#[test] fn external_targets_do_not_join_unrelated_components() {
 assert_eq!(solve(&[((1,0),None,0.1),((2,0),None,0.9)]),vec![((1,0),0.1),((2,0),0.9)]);
}
#[test] fn duplicates_generations_and_invalid_fractions() {
 assert_eq!(solve(&[((1,0),Some((2,0)),0.5),((2,0),Some((1,0)),0.3),((1,1),None,0.8),((9,0),None,f32::NAN),((8,0),None,1.0)]),vec![((1,0),0.3),((1,1),0.8),((2,0),0.3)]);
}
#[test] fn shared_time_preserves_common_translation_clearance() {
 let start=[0.0_f32,1.1];let displacement=1.0;
 let independent=[start[0]+displacement,start[1]+displacement*0.25];
 assert!(independent[1]-independent[0]<1.0);
 let fractions=solve(&[((1,0),Some((0,0)),0.25)]);
 let coherent=[start[0]+displacement*fractions[0].1,start[1]+displacement*fractions[1].1];
 assert!((coherent[1]-coherent[0]-1.1).abs()<1e-6);
}
#[test] fn bounded_linear_chain_uses_all_accepted_edges() {
 let hits:Vec<_>=(0..1000).map(|i|((i,0),Some((i+1,0)),if i==999 {0.1}else{0.9})).collect();
 let result=solve(&hits);assert_eq!(result.len(),1001);assert!(result.iter().all(|(_,t)|*t==0.1));
}
#[test] fn touching_links_propagate_only_from_impact_seeds() {
 assert!(solve(&[((1,0),Some((2,0)),1.0)]).is_empty());
 assert_eq!(solve(&[((1,0),Some((2,0)),1.0),((2,0),Some((3,0)),1.0),((1,0),None,0.125)]),vec![((1,0),0.125),((2,0),0.125),((3,0),0.125)]);
}
#[test] fn disconnected_touching_group_is_not_shortened() {
 assert_eq!(solve(&[((1,0),None,0.25),((2,0),Some((3,0)),1.0)]),vec![((1,0),0.25)]);
}
