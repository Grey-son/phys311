# Final Project Proposal - PHYS 311

**Name:** G. Roy  **Date:** Week 11
**Repo:** `github.com/grey-son/phys311` → `project/`
**Live (Lab 10 baseline):** `grey-son.github.io/phys311/`

---

## 1. Title & Pitch

**Orbital Golf — the same classic game but in space**

You golf in a multitude of unique courses consisting of static planets with Newtonion
Gravity. A live hud shows par, stroke, velocity, gravity heading, and distance from flag.
Escape from scene and orbit, as well as exceeding shot time, adds a stroke to the counter
and resets the ball to the previous starting position.

---

## 2. The Physics

### Forces and constraints

Single free body of mass $m$, radius $R$, position $\vec r$, velocity $\vec v$. Multiple constrained bodies
of high mass $>100m$ and radius $>10R$. Static only in the MUST tier (motion on a track is COULD — see §3).

| Term | Expression | Notes |
|---|---|---|
| Gravity | $\vec F_g = \sum_{i=1}^{n} \frac{GmM_i\vec r}{\abs{r_i}^3}$ | summed over each planet |
| Drag | $\vec F_D = -b\abs{\vec V}\vec V$ | $b = 0.005$ |
| Terrain contact | circle of radius 0.25 vs. circle of radius >50 | restitution $e = 0.2$ |

### The one new thing

**Trajectory predictiion for body influenced by the graivity of multiple large bodies.** 
My Lab 10 engine only knows circle–circle and axis-aligned walls. Everything else in this 
project — gravity, Verlet, the fixed-timestep accumulator, the pointer/keyboard input layer 
— already exists and ports over unchanged.

Circle resting condition is another candidate for "new," however it should only be a single
check inside the collision logic, with only collisions providing an impulse greater than some
epsilon actually applying the impulse, otherwise the collision sets the normal velocity to 0.

### Integrator

**Velocity Verlet at a fixed `DT = 1/240 s`**, inside the Week 9 accumulator.

Justification: the dominant force is conservative and the simulation runs for minutes of
wall time, so I want a symplectic method with bounded energy error. Euler-Cromer would
also be stable here, but Verlet is second order and already implemented and validated in
my Lab 9 test suite, so it costs me nothing.

### Units and scales

SI throughout: meters, seconds, kilograms, newtons. Typical scales — distance 0–1000 m,
velocity 0–50 m/s, Gravity 0-10N, golf ball radius $R = 0.25$ m (collision
proxy), planet radii 50–300 m. The camera is 1 px = 0.25 m at default zoom.

---

## 3. Three-Tier Scope

### MUST — end of Week 12

- Golf ball as a single body under newtonion gravity, integrated with Verlet at `DT = 1/240`
- Trajectory Prediction line, fading after some range
- Multiple levels with unique geometries
- Circle–Circle resting condition
- Win/lose check on hole collision
- HUD: speed, distance from flag, gravity direction, gravity strength, par, stroke
- Reset button that restores exact initial state
- Reset condition for orbit and escape
- **Deployed to GitHub Pages and loading cleanly from the public URL**

### SHOULD — Week 13

- Planets w/ atmosphere and drag
- Stars to collect in each level
- Energy/momentum ledger panel (kinetic + potential + contact losses)
- Level selection screen w/ score saving
- Keyboard accessibility and pointer options on all controls

### COULD — drop without regret

- Multiple golf ball variants and club variants — **droppable**
- A ghost replay of your best previous run — **droppable**
- Planets with fixed motion - **dropable**
- Dust-plume particle effect near the surface
- Sound
- A level editor

The MUST tier is extremely doable: most everything is already working in
`labs/lab10/`, save for the resting condition and game logic.

---

## 4. Validation Plan

All tests live in `project/tests/validate.js` and run headless under Node, which works
because my `engine/` layer has no `ctx` or `document` references.

### Test 1 — Conservative reduction ("switch it off")

Set restitution $e = 1$, drag $b = 0$ and disable the win/lose check. The system is
then a mass bouncing elastically on fixed terrain, which must conserve energy.

- **Quantity:** $\max |\Delta E / E_0|$ over 30 s, $E = T + P_g$
- **Expected:** bounded, no secular growth
- **Tolerance:** **< 1.0 %**

### Test 2 — Timestep convergence

Hit one scripted shot at
`DT = 1/60, 1/120, 1/240, 1/480`.

- **Quantity:** touchdown position $x$ and impact speed
- **Expected:** convergent as `DT → 0`
- **Tolerance:** **< 0.5 % change between the last two halvings**

## 5. Biggest Risk + Fallback

> The thing most likely to sink this project is the **circle-vs-circle resting condition
> misbehaving for a body experiencing forces — causing overlap, tunneling at
> high descent speed, or jittering instead of resting** — and my fallback is to **make
> the golf ball sticky, i.e. replace the golf ball with a static ball on a collision**,
> which only requires implementing a toggle for the static boolean in bodies, or allowing
> for existing bodies in a world to be removed.

The fallback is reasonable: it changes how the strategies a player may use and how they
interact with the environment, but is not detrimental and is easy to implement.

---

## 6. Timeline

| Week | Deliverable |
|---|---|
| 11 | This proposal + 90-minute risk spike + workshop reviews |
| 12 | MUST tier complete, validation tests passing, deployed to Pages |
| 13 | SHOULD tier (level select, collectables), full validation report, 
`VALIDATION.md` + README, beta posted for peer review |

---

## 7. Audience

Intro-mechanics students and curious non-physicists. After a few minutes they should
understand better how to use a large bodies gravity to their advantage —
an idea that is of real use in astronomy and aerospace engineering.