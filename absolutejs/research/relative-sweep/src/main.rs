//! Qualify the existing two-moving-proxy primitive independently of Rapier scheduling.
use parry3d::{
    math::{Pose, Rotation, Vector},
    query::sweep_toi::{Sweep, SweepToiStatus, ToiProxy, sweep_time_of_impact},
};
use serde_json::json;
fn pose(p: Vector) -> Pose {
    Pose::from_parts(p, Rotation::IDENTITY)
}
fn main() {
    let dt = 1.0 / 60.0;
    let slop = 0.000001;
    let ball = ToiProxy::point(Vector::ZERO, 0.1);
    let fixtures = [
        (
            "head-on",
            Vector::new(-0.5, 0.0, 0.0),
            Vector::new(0.5, 0.0, 0.0),
            Vector::new(120.0, 0.0, 0.0),
            Vector::ZERO,
        ),
        (
            "perpendicular",
            Vector::new(-1.0, 0.0, 0.0),
            Vector::new(0.0, -1.0, 0.0),
            Vector::new(120.0, 0.0, 0.0),
            Vector::new(0.0, 120.0, 0.0),
        ),
        (
            "near-miss",
            Vector::new(-0.5, 0.3, 0.0),
            Vector::new(0.5, 0.0, 0.0),
            Vector::new(120.0, 0.0, 0.0),
            Vector::ZERO,
        ),
    ];
    let mut cases = Vec::new();
    let mut frozen_mismatches = 0;
    for (name, start_a, start_b, va, vb) in fixtures {
        let delta = start_b - start_a;
        let relative = (vb - va) * dt;
        // Independent analytic sphere contact, including the primitive's documented slop.
        let radius = 0.2 - slop;
        let a = relative.length_squared();
        let b = 2.0 * delta.dot(relative);
        let c = delta.length_squared() - radius * radius;
        let discriminant = b * b - 4.0 * a * c;
        let expected = if discriminant >= 0.0 {
            Some((-b - discriminant.sqrt()) / (2.0 * a))
        } else {
            None
        };
        for boost_x in [-120.0, -60.0, 0.0, 60.0, 120.0] {
            for swap in [false, true] {
                let boost = Vector::new(boost_x, 37.0, -11.0);
                let sa = Sweep::from_poses(
                    &pose(start_a),
                    &pose(start_a + (va + boost) * dt),
                    Vector::ZERO,
                );
                let sb = Sweep::from_poses(
                    &pose(start_b),
                    &pose(start_b + (vb + boost) * dt),
                    Vector::ZERO,
                );
                let (first, second) = if swap { (&sb, &sa) } else { (&sa, &sb) };
                let result = sweep_time_of_impact(&ball, first, &ball, second, 1.0, slop);
                match expected {
                    Some(t) => {
                        assert_eq!(
                            result.status,
                            SweepToiStatus::Hit,
                            "{name} boost={boost_x} swap={swap}"
                        );
                        assert!(
                            (result.fraction - t).abs() < 0.00001,
                            "TOI mismatch {name}: {} vs {t}",
                            result.fraction
                        );
                    }
                    None => assert_eq!(result.status, SweepToiStatus::Separated),
                }
                let frozen_sweep = Sweep::constant(&second.final_transform(), Vector::ZERO);
                let frozen = sweep_time_of_impact(&ball, first, &ball, &frozen_sweep, 1.0, slop);
                let frozen_matches = match expected {
                    Some(t) => {
                        frozen.status == SweepToiStatus::Hit
                            && (frozen.fraction - t).abs() < 0.00001
                    }
                    None => frozen.status == SweepToiStatus::Separated,
                };
                if !frozen_matches {
                    frozen_mismatches += 1;
                }
                cases.push(json!({"frozenTargetStatus":format!("{:?}",frozen.status),"frozenTargetFraction":frozen.fraction,"frozenTargetMatchesAnalytic":frozen_matches,"fixture":name,"boost":[boost_x,37.0,-11.0],"swap":swap,"expectedFraction":expected,"actualFraction":result.fraction,"status":format!("{:?}", result.status)}));
            }
        }
    }
    assert!(
        frozen_mismatches > 0,
        "Negative control did not expose frozen-target error"
    );
    println!("{}",serde_json::to_string_pretty(&json!({"frozenTargetMismatches":frozen_mismatches,"parry":"0.31.1","precision":"f32","cases":cases,"passed":true,"scope":"Two-sweep primitive only; no world integration, broadphase, rotation, or compound acceptance claim"})).unwrap());
}
