pub use rapier3d::{dynamics, geometry, parry};
mod alloc_prelude {
    pub use std::vec::Vec;
}
#[path = "../../../../src/dynamics/ccd/sweep_candidates.rs"]
mod candidates;
use candidates::*;
use rapier3d::{
    parry::{
        bounding_volume::{Aabb, BoundingVolume},
        partitioning::{Bvh, BvhBuildStrategy},
    },
    prelude::*,
};
fn original(
    tree: &Bvh,
    set: &ColliderSet,
    owner: RigidBodyHandle,
    query: Aabb,
) -> Vec<ColliderHandle> {
    tree.leaves(|n| n.aabb().intersects(&query))
        .filter_map(|key| {
            let (co, h) = set.get_unknown_gen(key)?;
            (co.parent() != Some(owner)).then_some(h)
        })
        .collect()
}
#[test]
fn preserves_fat_leaf_bounds_and_order_for_contained_queries() {
    for strategy in [BvhBuildStrategy::Binned, BvhBuildStrategy::Ploc] {
        let mut bodies = RigidBodySet::new();
        let owner = bodies.insert(RigidBodyBuilder::dynamic());
        let mut set = ColliderSet::new();
        let mut leaves = Vec::new();
        for i in 0..300 {
            let p = Vector::new(
                ((i * 17) % 37) as f32 - 18.,
                ((i * 11) % 23) as f32 - 11.,
                ((i * 7) % 29) as f32 - 14.,
            );
            let co = ColliderBuilder::ball(0.01).translation(p);
            let h = if i % 3 == 0 {
                set.insert_with_parent(co, owner, &mut bodies)
            } else {
                set.insert(co)
            };
            leaves.push((
                h.into_raw_parts().0 as usize,
                Aabb::new(p - Vector::splat(2.), p + Vector::splat(2.)),
            ));
        }
        let tree = Bvh::from_iter(strategy, leaves);
        let envelope = Aabb::new(Vector::splat(-40.), Vector::splat(40.));
        let cache = collect_external_sweep_candidates(&tree, &set, owner, envelope).unwrap();
        assert_eq!(cache.len(), 200);
        for i in 0..2000 {
            let p = Vector::new(
                ((i * 19) % 61) as f32 - 30.,
                ((i * 13) % 53) as f32 - 26.,
                ((i * 29) % 47) as f32 - 23.,
            );
            let query = Aabb::new(p - Vector::splat(0.2), p + Vector::splat(0.2));
            let cached: Vec<_> = cache
                .iter()
                .filter(|(_, b)| b.intersects(&query))
                .map(|(h, _)| *h)
                .collect();
            assert_eq!(cached, original(&tree, &set, owner, query), "query {i}");
        }
    }
}
#[test]
fn overflow_falls_back_instead_of_truncating_and_own_pieces_do_not_consume_budget() {
    let mut bodies = RigidBodySet::new();
    let owner = bodies.insert(RigidBodyBuilder::dynamic());
    let mut set = ColliderSet::new();
    let bounds = Aabb::new(Vector::splat(-1.), Vector::splat(1.));
    for _ in 0..1000 {
        set.insert_with_parent(ColliderBuilder::ball(1.), owner, &mut bodies);
    }
    for count in 0..=MAX_BODY_SWEEP_TARGETS + 1 {
        if count > 0 {
            set.insert(ColliderBuilder::ball(1.));
        }
        if count == 0 || count >= MAX_BODY_SWEEP_TARGETS {
            let tree = Bvh::from_iter(
                BvhBuildStrategy::Binned,
                set.iter()
                    .map(|(h, _)| (h.into_raw_parts().0 as usize, bounds)),
            );
            let cache = collect_external_sweep_candidates(&tree, &set, owner, bounds);
            if count > MAX_BODY_SWEEP_TARGETS {
                assert!(cache.is_none());
            } else {
                assert_eq!(cache.unwrap().len(), count);
            }
        }
    }
    let tree = Bvh::new();
    assert!(collect_external_sweep_candidates(
        &tree,
        &set,
        owner,
        Aabb::new(
            Vector::splat(f32::NEG_INFINITY),
            Vector::splat(f32::INFINITY)
        )
    )
    .is_none());
}

#[test]
fn retained_fat_bounds_cover_touching_queries_and_stale_generations_follow_original_lookup() {
    let mut bodies = RigidBodySet::new();
    let owner = bodies.insert(RigidBodyBuilder::dynamic());
    let mut set = ColliderSet::new();
    let first = set.insert(ColliderBuilder::ball(0.01));
    let fat = Aabb::new(Vector::splat(-2.), Vector::splat(2.));
    let tree = Bvh::from_iter(
        BvhBuildStrategy::Binned,
        [(first.into_raw_parts().0 as usize, fat)],
    );
    let edge = Aabb::new(Vector::new(2., 0., 0.), Vector::new(2., 0., 0.));
    assert!(!set[first].compute_aabb().intersects(&edge));
    let cache = collect_external_sweep_candidates(&tree, &set, owner, fat).unwrap();
    assert_eq!(
        cache
            .iter()
            .filter(|(_, b)| b.intersects(&edge))
            .map(|(h, _)| *h)
            .collect::<Vec<_>>(),
        vec![first]
    );
    let mut islands = IslandManager::new();
    let mut soft = SoftBodySet::new();
    set.remove(first, &mut islands, &mut bodies, &mut soft, false);
    assert!(collect_external_sweep_candidates(&tree, &set, owner, fat)
        .unwrap()
        .is_empty());
    let own = set.insert_with_parent(ColliderBuilder::ball(0.01), owner, &mut bodies);
    assert_eq!(first.into_raw_parts().0, own.into_raw_parts().0);
    assert_ne!(first, own);
    assert!(collect_external_sweep_candidates(&tree, &set, owner, fat)
        .unwrap()
        .is_empty());
    set.remove(own, &mut islands, &mut bodies, &mut soft, false);
    let replacement = set.insert(ColliderBuilder::ball(0.01));
    let cached = collect_external_sweep_candidates(&tree, &set, owner, fat).unwrap();
    assert_eq!(
        cached.iter().map(|(h, _)| *h).collect::<Vec<_>>(),
        original(&tree, &set, owner, fat)
    );
    assert_eq!(cached[0].0, replacement);
}
