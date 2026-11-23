//VERIFICATION TESTS
import { Vec2 } from "./vec2.js";
import { Body } from "./body.js";
import { World } from "./world.js";
import { VelocityVerlet } from "./verlet.js";
import { NewtonianGravity, SlingshotForce, SlidingFriction } from "./forces.js";
import { BodyCollisions } from "./collisions.js";

function buildTestWorld(level, { restitution, frictionZero = false }) {
    const world = new World(VelocityVerlet);

    for (const data of level.bodies) {
        const body = new Body({
            ...data,
            pos: new Vec2(...data.pos),
            uK: frictionZero ? 0 : (data.uK ?? 0)
        });
        world.add(body);
    }

    const projectile = new Body({
        ...level.projectile,
        pos: new Vec2(...level.projectile.pos),
        vel: new Vec2(...level.projectile.vel),
        uK: frictionZero ? 0 : (level.projectile.uK ?? 0)
    });
    world.add(projectile);

    const { G, softening, collisionEps } = level.physics;
    world.addForce(new NewtonianGravity(G, softening));
    world.addForce(new SlidingFriction());

    const collisions = new BodyCollisions(restitution, collisionEps);
    world.addConstraint(collisions);

    world.primeAccelerations();

    return { world, projectile, collisions };
}

/**
 * Test 1 — Conservative reduction
 * e = 1, friction/drag = 0, win/lose disabled, 30 s duration.
 */
export function runTest1Conservative(level, dt = 1 / 240) {
    const { world, projectile } = buildTestWorld(level, {
        restitution: 1,
        frictionZero: true
    });

    // Give the projectile a scripted shot so it bounces across the fixed terrain
    const sling = new SlingshotForce({ ...level.slingshot });
    const scriptedPull = new Vec2(-2.5, -2.5);
    const impulse = sling.impulseForPull(scriptedPull);
    projectile.vel.addScaled(projectile.invMass, impulse);

    const E0 = world.totalEnergy();
    const totalSteps = Math.round(30 / dt);

    let maxRelDrift = 0;
    let maxDriftTime = 0;

    for (let step = 1; step <= totalSteps; step++) {
        world.step(dt);
        const E = world.totalEnergy();
        const relDrift = E0 === 0 ? 0 : Math.abs((E - E0) / E0);

        if (relDrift > maxRelDrift) {
            maxRelDrift = relDrift;
            maxDriftTime = world.time;
        }
    }

    const maxDriftPercent = maxRelDrift * 100;
    const passed = maxDriftPercent < 1.0;

    console.group("=== TEST 1: Conservative Reduction (30 s, e = 1, friction = 0) ===");
    console.log(`Initial Energy E0     : ${E0.toFixed(6)} J`);
    console.log(`Final Energy E(30s)   : ${world.totalEnergy().toFixed(6)} J`);
    console.log(`Max |ΔE / E0|         : ${maxDriftPercent.toFixed(5)}% (at t = ${maxDriftTime.toFixed(2)} s)`);
    console.log(`Tolerance (< 1.0%)    : ${passed ? "PASS" : "FAIL"}`);
    console.groupEnd();

    return { E0, maxDriftPercent, passed };
}

/**
 * Test 2 — Timestep convergence
 * Runs one identical scripted shot across DT = 1/60, 1/120, 1/240, 1/480
 * and measures touchdown x and impact speed at first contact.
 */
export function runTest2Convergence(level) {
    const dts = [1 / 60, 1 / 120, 1 / 240, 1 / 480];
    const scriptedPull = new Vec2(-2.5, -2.5);
    const maxSimTime = 30;
    const results = [];

    for (const dt of dts) {
        const { world, projectile, collisions } = buildTestWorld(level, {
            restitution: level.physics.restitution,
            frictionZero: false
        });

        const sling = new SlingshotForce({ ...level.slingshot });
        const impulse = sling.impulseForPull(scriptedPull);
        projectile.vel.addScaled(projectile.invMass, impulse);

        const maxSteps = Math.round(maxSimTime / dt);
        let touchdownX = null;
        let impactSpeed = null;
        let touchdownTime = null;

        for (let step = 1; step <= maxSteps; step++) {
            const prevPos = projectile.pos.clone();
            const prevVel = projectile.vel.clone();

            // 1. Advance forces & integration (before collision velocity/position projection)
            world.clearForces();
            world.applyForces();
            world.Integrator.step(world, dt);

            const postIntPos = projectile.pos.clone();
            const postIntVel = projectile.vel.clone();

            for (const c of world.constraints) {
                if (typeof c.count === "number") c.count = 0;
            }
            world.resolveConstraints();
            world.time += dt;
            world.steps += 1;

            if (collisions.count > 0) {
                // Find the fixed/other body we collided with to interpolate exact surface contact
                let alpha = 1;
                for (const other of world.bodies) {
                    if (other === projectile) continue;
                    const sumR = projectile.radius + other.radius;
                    const d0 = prevPos.sub(other.pos).length() - sumR;
                    const d1 = postIntPos.sub(other.pos).length() - sumR;
                    if (d1 <= 0 && d0 > d1) {
                        alpha = Math.max(0, Math.min(1, d0 / (d0 - d1)));
                        break;
                    }
                }

                touchdownX = prevPos.x + alpha * (postIntPos.x - prevPos.x);
                const vx = prevVel.x + alpha * (postIntVel.x - prevVel.x);
                const vy = prevVel.y + alpha * (postIntVel.y - prevVel.y);
                impactSpeed = Math.hypot(vx, vy);
                touchdownTime = (world.time - dt) + alpha * dt;
                break;
            }
        }

        results.push({
            DT: `1/${Math.round(1 / dt)}`,
            dt,
            touchdownTime: touchdownTime !== null ? Number(touchdownTime.toFixed(5)) : "NO HIT",
            touchdownX: touchdownX !== null ? Number(touchdownX.toFixed(6)) : "NO HIT",
            impactSpeed: impactSpeed !== null ? Number(impactSpeed.toFixed(6)) : "NO HIT"
        });
    }

    const r240 = results[2]; // 1/240
    const r480 = results[3]; // 1/480

    let xChangePct = Infinity;
    let vChangePct = Infinity;

    if (typeof r240.touchdownX === "number" && typeof r480.touchdownX === "number") {
        xChangePct = Math.abs((r480.touchdownX - r240.touchdownX) / r480.touchdownX) * 100;
        vChangePct = Math.abs((r480.impactSpeed - r240.impactSpeed) / r480.impactSpeed) * 100;
    }

    const passed = xChangePct < 0.5 && vChangePct < 0.5;

    console.group("=== TEST 2: Timestep Convergence ===");
    console.table(results);
    console.log(`Δx (1/240 → 1/480)       : ${xChangePct.toFixed(5)}%`);
    console.log(`Δ|v| (1/240 → 1/480)     : ${vChangePct.toFixed(5)}%`);
    console.log(`Tolerance (< 0.5% each)  : ${passed ? "PASS" : "FAIL"}`);
    console.groupEnd();

    return { results, xChangePct, vChangePct, passed };
}

/**
 * Binds [1] and [2] keys (or [T] to run both) while a level is loaded.
 * Returns a cleanup function.
 */
export function attachVerificationTests(getCurrentLevel) {
    function onKeyDown(event) {
        const level = getCurrentLevel();
        if (!level || event.repeat) return;

        if (event.key === "1") {
            runTest1Conservative(level);
        } else if (event.key === "2") {
            runTest2Convergence(level);
        } else if (event.key.toLowerCase() === "t") {
            runTest1Conservative(level);
            runTest2Convergence(level);
        }
    }

    window.addEventListener("keydown", onKeyDown);
    console.info("[Verification Tests Ready] Load a level and press '1' (Test 1), '2' (Test 2), or 'T' (Both).");
    return () => window.removeEventListener("keydown", onKeyDown);
}