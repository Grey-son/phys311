# Final Project Progress - PHYS 311

**Name:** G. Roy  **Date:** Week 12
**Repo:** `github.com/grey-son/phys311` → `project/`
**Live:** `grey-son.github.io/phys311/`

---

## MUST tier status

| Item | Status | Notes |
|---|---|---|
| Golf Ball Simulated | Implemented | N/a |
| Trajectory Prediction | Implemented | N/a |
| Multiple Levels | Implemented | N/a |
| Circle–Circle resting | Implemented | N/a |
| Win/lose check | Implemented | N/a |
| HUD | Implemented | N/a |
| Reset button | Implemented | N/a |
| Reset Condition | Cut | User can reset level themselves |

## Validation Results

| Test | Expected | Measured | Pass? |
|---|---|---|---|
| Conservative Reduction | $\max |\Delta E / E_0| < 0.1%$ | 0.00774% | Pass |
| Timestep Convergence | Touchdown and Velocity change $< 0.5%$ | (x) 0.00002%, (v)  0.11487% | Pass |

## Decisions

2026-11-22 — Reset Condition for Orbit and Escape
Planned: automatically reset the system when a body escapes or is in orbit.
Did: cut the feature.
Why: orbits are unlikely to occur due to the geometries of the levels and
    in the case of escape, the user can reset the level themselves.

## Bugs

- Friction not applying consistently
    Caused by friction being applied before other forces, with an incomplete normal force
    Fixed by adding a contact force tag which routes a force to be applied last

- FPS not displaying properly
    Caused by fps being set to zero on initialization and not updated properly
    Fixed by updating the fps calculation in the main loop, as well as updating the HUD call

## Next Week

The should items I haven't implemented are below, and the first thing to tackle for next week:
- Planets w/ atmosphere and drag
- Stars to collect in each level
- Energy/momentum ledger panel (kinetic + potential + contact losses)