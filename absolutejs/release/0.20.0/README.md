# Prepared 0.20.0 release — publication deferred

This combines the queued 0.19.0 fluid-impulse APIs with measured solve-group observations, owned bounded profile dictionaries and lossless diagnostic packets. There is no change to force sampling, solve-group selection, integration or contact policy. The native observer's package hash is ea0d5cef08a15c9a4ff88f3696ddc55ddd82136ee776ea78844889fe65667654 (3,364,616 bytes).

Qualification before release identity: 266 package tests / 92,170 assertions; GPU-disabled browser worker; 18 fixtures / 9,240 exact predecessor/unprofiled/profiled snapshot steps; independently built native targets and all 53 current API files identical. The game integration passes 947 tests / 7,619,390 assertions, candidate TypeScript and actual bounded SwiftShader inspection with 27 decoded received profile packets and copied terminal schedule. Read `absolutejs/research/solver-schedule/` and game commit089ab1bb for complete evidence and recorded rejected attempts.

The production release identity still requires its own archive/browser/API-build checks and game qualification before it replaces 0.19.0 in the deferred publication queue. This file does not report publication. User authentication and publication prompts remain deferred.

Limitations: schedules observe completed profiled steps, not future or per-body schedules, PGS sweeps or CPU cost. The codec validates bounded numeric representation, not physical truth or provenance. Long rotating CPU samples are noisy and do not prove zero overhead or hardware FPS. None of this establishes fluid wetting, wakes or arbitrary world destruction.
