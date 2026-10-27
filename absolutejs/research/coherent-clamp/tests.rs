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

#[test] fn incremental_updates_only_return_changed_members() {
 let mut graph=clamp_graph::ClampGraph::new();
 assert_eq!(graph.add_hit((1,0),None,0.5),vec![((1,0),0.5)]);
 assert_eq!(graph.add_hit((1,0),Some((2,0)),1.0),vec![((2,0),0.5)]);
 assert!(graph.add_hit((2,0),Some((1,0)),0.8).is_empty());
 let mut changed=graph.add_hit((2,0),None,0.25);changed.sort_by_key(|v|v.0);
 assert_eq!(changed,vec![((1,0),0.25),((2,0),0.25)]);
 assert_eq!(graph.fractions(),changed);
}
#[test] fn incremental_graph_matches_independent_fixed_point_reference() {
 // Deterministic generated graphs, including duplicate edges and disconnected seeds.
 let mut seed=731_u32;
 for _ in 0..50 {
  let mut hits=Vec::new();let mut times=[1.0_f32;24];let mut edges=Vec::new();
  for _ in 0..80 {
   seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);let a=(seed%24) as usize;
   seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);let b=(seed%24) as usize;
   seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);let t=(seed%9+1) as f32/10.0;
   if seed%3==0 { hits.push(((a as u32,0),None,t));times[a]=times[a].min(t); }
   else { hits.push(((a as u32,0),Some((b as u32,0)),1.0));edges.push((a,b)); }
  }
  loop {let mut changed=false;for &(a,b) in &edges {let t=times[a].min(times[b]);changed|=times[a]!=t||times[b]!=t;times[a]=t;times[b]=t;}if !changed {break;}}
  let expected:Vec<_>=times.iter().enumerate().filter(|(_,t)|**t<1.0).map(|(i,&t)|((i as u32,0),t)).collect();
  assert_eq!(solve(&hits),expected);hits.reverse();assert_eq!(solve(&hits),expected);
 }
}
#[test] fn long_incremental_chain_reports_each_new_body_once() {
 let mut graph=clamp_graph::ClampGraph::new();
 let mut updates=graph.add_hit((0,0),None,0.125).len();
 for i in 0..10_000 { updates+=graph.add_hit((i,0),Some((i+1,0)),1.0).len(); }
 assert_eq!(updates,10_001);
 let fractions=graph.fractions();assert_eq!(fractions.len(),10_001);
 assert!(fractions.iter().all(|(_,t)|*t==0.125));
 assert!(graph.add_hit((0,0),Some((10_000,0)),1.0).is_empty());
}
