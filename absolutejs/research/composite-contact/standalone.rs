use rapier3d::parry::{
    query::{ContactManifold, DefaultQueryDispatcher, PersistentQueryDispatcher},
    shape::{ConvexPolyhedron, Triangle},
};
use rapier3d::prelude::*;
use serde_json::{json, Value};
use std::fs;
fn main() {
    let args: Vec<_> = std::env::args().collect();
    assert_eq!(args.len(), 3);
    let fixture: Value = serde_json::from_slice(&fs::read(&args[1]).unwrap()).unwrap();
    let verts: [[f32; 3]; 3] = serde_json::from_value(fixture["triangle"].clone()).unwrap();
    let hull: ConvexPolyhedron = serde_json::from_value(fixture["convexShape"].clone()).unwrap();
    let t: [f32; 3] = serde_json::from_value(fixture["relativeTranslation"].clone()).unwrap();
    let q: [f32; 4] = serde_json::from_value(fixture["relativeRotation"].clone()).unwrap();
    let prediction = fixture["prediction"].as_f64().unwrap() as f32;
    let original_pose = Pose::from_parts(
        Vector::from_array(t),
        Rotation::from_xyzw(q[0], q[1], q[2], q[3]),
    );
    let mut rows = Vec::new();
    for origin in [Vector::ZERO, Vector::from_array(verts[0])] {
        let triangle = Triangle::new(
            Vector::from_array(verts[0]) - origin,
            Vector::from_array(verts[1]) - origin,
            Vector::from_array(verts[2]) - origin,
        );
        let mut pose = original_pose;
        pose.translation -= origin;
        assert_eq!(pose.translation + origin, original_pose.translation);
        for (p, expected) in [triangle.a, triangle.b, triangle.c].iter().zip(verts) {
            assert_eq!(*p + origin, Vector::from_array(expected));
        }
        let mut manifold: ContactManifold<(), ()> = ContactManifold::new();
        DefaultQueryDispatcher
            .contact_manifold_convex_convex(
                &pose,
                &triangle,
                &hull,
                None,
                None,
                prediction,
                &mut manifold,
            )
            .unwrap();
        rows.push(json!({"origin":origin.to_array(),"normal":manifold.local_n1.to_array(),"minimumDistance":manifold.points.iter().map(|p|p.dist).reduce(f32::min),"pointCount":manifold.points.len()}));
    }
    fs::write(&args[2], serde_json::to_string_pretty(&json!({"scope":"Standalone exact serialized convex geometry; no physics world, snapshots, time stepping or cached manifold", "rows":rows})).unwrap()+"\n").unwrap();
}
