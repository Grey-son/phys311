import { Vec2 } from './engine/vec2.js';
import { Body } from './engine/body.js';
import { Gravity, Drag } from './engine/forces.js';
import { Euler, EulerCromer, VelocityVerlet } from './engine/integrators.js';
import { World } from './engine/world.js';
import { Camera } from './render/camera.js';
import { draw } from './render/renderer.js';

const G = 9.81;
let C = 0.01;
const MAX_FRAME = 0.25;

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");
const logEl = document.getElementById("log");
const variableDt = document.getElementById("variableDt");

let dtDenom = 240;
let DT = 1 / dtDenom;
let world, hud, paused = false;
let accumulator = 0;
let lastTime = performance.now() / 1000;
let fpsEMA = 60;

const INTEGRATORS = {"euler": Euler, "euler-cromer": EulerCromer, "verlet": VelocityVerlet};
const SCENES = {"no drag": buildProjectile, "drag": buildProjectileDrag, "static": buildStatic}

function buildProjectile(integratorName) {
  const w = new World(INTEGRATORS[integratorName]);
  const v0 = 20, th = 50 * Math.PI / 180;
  w.add(new Body({
    mass: 1, radius: 0.35, color: "#ff8200",
    pos: new Vec2(0, 0),
    vel: new Vec2(v0 * Math.cos(th), v0 * Math.sin(th))
  }));
  w.addForce(new Gravity(G));
  w.primeAccelerations();
  w.meta = { kind: "no drag", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5 };
  return w;
}

function buildProjectileDrag(integratorName) {
  const w = new World(INTEGRATORS[integratorName]);
  const v0 = 20, th = 50 * Math.PI / 180;
  w.add(new Body({
    mass: 1, radius: 0.35, color: "#ff8200",
    pos: new Vec2(0, 0),
    vel: new Vec2(v0 * Math.cos(th), v0 * Math.sin(th))
  }));
  w.addForce(new Gravity(G));
  w.addForce(new Drag(C));
  w.primeAccelerations();
  w.meta = { kind: "drag", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5 };
  return w;
}

function buildStatic(integratorName) {
    const w = new World(INTEGRATORS[integratorName]);
  w.add(new Body({
    mass: 1, radius: 0.3, color: "#ff8200",
    pos: new Vec2(2, 3),
  }));
  w.meta = { kind: "static", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 1 };
  return w;
}

function buildScene(sceneName, integratorName) {
  return SCENES[sceneName](integratorName)
}

function resetSim() {
  const scene = document.getElementById("scene").value
  const method = document.getElementById("integrators").value;
  dtDenom = parseInt(document.getElementById("dt").value, 10);
  C = parseFloat(document.getElementById("C").value, 10)
  DT = 1 / dtDenom;

  world = buildScene(scene, method);
  hud = { E0: world.totalEnergy(), fps: 60, lastSteps: 0,
          method: method, dtDenom: dtDenom };
  accumulator = 0;
  lastTime = performance.now() / 1000;
}

function frame(nowMs) {
  const now = nowMs / 1000;
  let frameTime = now - lastTime;
  lastTime = now;

  if (frameTime > 0) fpsEMA = 0.9 * fpsEMA + 0.1 * (1 / frameTime);
  hud.fps = fpsEMA;

  if (frameTime > MAX_FRAME) frameTime = MAX_FRAME;

  let n = 0;
  if (!paused) {
    const variableDt = document.getElementById("variableDt").checked;

    if (variableDt) {
      // Variable timestep: integrate using measured frame time
      world.step(frameTime);
      n++;

      const b = world.bodies[0];
      if (world.steps % 4 === 0) {
        b.trail.push(b.pos.clone());
        if (b.trail.length > 600) b.trail.shift();
      }

      if (
        (world.meta.kind === "no drag" || world.meta.kind === "drag") &&
        b.pos.y < 0
      ) {
        paused = true;
        document.getElementById("pause").textContent = "Resume";
      }
    } else {
      // Fixed timestep: use the accumulator
      accumulator += frameTime;

      while (accumulator >= DT) {
        world.step(DT);
        accumulator -= DT;
        n++;

        const b = world.bodies[0];
        if (world.steps % 4 === 0) {
          b.trail.push(b.pos.clone());
          if (b.trail.length > 600) b.trail.shift();
        }

        if (
          (world.meta.kind === "no drag" || world.meta.kind === "drag") &&
          b.pos.y < 0
        ) {
          paused = true;
          document.getElementById("pause").textContent = "Resume";
          break;
        }
      }
    }
  }
  hud.lastSteps = n;

  draw(ctx, canvas, world, hud);
  requestAnimationFrame(frame);
}

// Logging Helpers & Validation Suite
function clearLog() { logEl.textContent = ""; }
function say(s, cls) {
  const span = document.createElement("div");
  if (cls) span.className = cls;
  span.textContent = s + "";
  logEl.appendChild(span);
  logEl.scrollTop = logEl.scrollHeight;
}

function vec2SelfTest() {
  const a = new Vec2(3, 4), b = new Vec2(1, -2);
  say("=== Vec2 self-test (Lab 8 Part A) ===", "dim");
  const checks = [
    ["a.add(b)",       `(${a.add(b).x}, ${a.add(b).y})`,            "(4, 2)"],
    ["a.sub(b)",       `(${a.sub(b).x}, ${a.sub(b).y})`,            "(2, 6)"],
    ["a.mul(2)",       `(${a.mul(2).x}, ${a.mul(2).y})`,            "(6, 8)"],
    ["a.dot(b)",       a.dot(b).toFixed(10),                        "-5.0000000000"],
    ["a.length()",     a.length().toFixed(10),                      "5.0000000000"],
    ["a.lengthSq()",   a.lengthSq().toFixed(10),                    "25.0000000000"],
    ["a.normalized()", `(${a.normalized().x.toFixed(10)}, ${a.normalized().y.toFixed(10)})`,
                       "(0.6000000000, 0.8000000000)"],
    ["|normalized|",   a.normalized().length().toFixed(15),         "1.000000000000000"]
  ];
  let allPass = true;
  for (const [name, got, want] of checks) {
    const pass = got === want;
    if (!pass) allPass = false;
    say((pass ? "  PASS  " : "  FAIL  ") + name.padEnd(16) + "= " + got.padEnd(30) +
        (pass ? "" : " expected " + want), pass ? "ok" : "bad");
  }
  say(allPass ? "  -> all Vec2 operations agree with Python exactly."
              : "  -> MISMATCH: fix Vec2 before trusting anything downstream.",
      allPass ? "ok" : "bad");
  say("");
}

function runHeadless(method, dt, tEnd) {
  const w = buildProjectile(method);
  const E0 = w.totalEnergy();
  let Emin = E0, Emax = E0;
  while (w.time < tEnd - 1e-12) {
    w.step(dt);
    const E = w.totalEnergy();
    if (E < Emin) Emin = E;
    if (E > Emax) Emax = E;
  }
  const b = w.bodies[0];
  return { x: b.pos.x, y: b.pos.y, vx: b.vel.x, vy: b.vel.y,
           t: w.time, n: w.steps, E0: E0, E: w.totalEnergy(),
           worst: Math.max(Math.abs(Emax - E0), Math.abs(Emin - E0)) / E0 };
}

function row(label, got, ref, tol) {
  const err = Math.abs(got - ref);
  const pass = err <= tol;
  say("  " + (pass ? "PASS" : "FAIL") + "  " + label.padEnd(22) +
      got.toFixed(12).padStart(18) + ref.toFixed(12).padStart(20) +
      ("  err " + err.toExponential(2)), pass ? "ok" : "bad");
  return pass;
}

function validate() {
  clearLog();
  vec2SelfTest();

  const DTv = 1 / 240;
  let allPass = true;

  say("=== Projectile: v0=25 m/s @ 45 deg, DT=1/240, t_end=2.0 s ===", "dim");
  say("        quantity                        JavaScript       Python (ref)");

  const REF = {
    "euler-cromer": { x: 25.711504387461, y: 10.980902724759,
                      vy: -4.299111137620, vx: 12.855752193731,
                      dE: -2.004919e-03 },
    "verlet":       { x: 25.711504387461, y: 11.021777724759,
                      vy: -4.299111137620, vx: 12.855752193731,
                      dE: 3.410605e-15 }
  };

  for (const m of ["euler-cromer", "verlet"]) {
    const r = runHeadless(m, DTv, 2.0);
    say("  -- " + m + "  (" + r.n + " steps) --", "dim");
    if (r.n !== 480) {
      say("  FAIL  step count = " + r.n + ", expected 480 " +
          "-> your loop condition is wrong; nothing else will match.", "bad");
      allPass = false;
    }
    allPass = row("x (m)",  r.x,  REF[m].x,  1e-9) && allPass;
    allPass = row("y (m)",  r.y,  REF[m].y,  1e-9) && allPass;
    allPass = row("vx (m)",  r.vx,  REF[m].vx,  1e-9) && allPass;
    allPass = row("vy (m/s)", r.vy, REF[m].vy, 1e-9) && allPass;
    const dE = (r.E - r.E0) / r.E0;
    allPass = row("dE (J)", r.dE, REF[m].dE, 1e-8) && allPass;
    say("        dE/E0" + " ".padEnd(17) +
        (dE >= 0 ? "+" : "") + dE.toExponential(6).padStart(17) +
        ("  ref " + REF[m].dE.toExponential(6)), "dim");
  }

  say("");
  say("=== Euler-Cromer error vs. the Week 2 §5.5 closed form ===", "dim");
  const ec = runHeadless("euler-cromer", DTv, 2.0);
  const yExact = 25 * Math.sin(45 * Math.PI / 180) * 2 - 0.5 * G * 4;
  const dyMeas = ec.y - yExact;
  const dyPred = -0.5 * G * 2.0 * DTv;
  say("  measured  y_EC - y_exact  = " + dyMeas.toFixed(15) + " m");
  say("  predicted -0.5*g*t*dt     = " + dyPred.toFixed(15) + " m");
  say("  difference                = " + Math.abs(dyMeas - dyPred).toExponential(2) + " m",
      Math.abs(dyMeas - dyPred) < 1e-11 ? "ok" : "bad");

  say("");
  say("=== Fixed-timestep accumulator: frame-rate independence ===", "dim");
  function accRun(frames, clamp) {
    let acc = 0, t = 0, steps = 0, worst = 0;
    for (let ft of frames) {
      if (ft > clamp) ft = clamp;
      acc += ft;
      let k = 0;
      while (acc >= DTv) { t += DTv; steps++; k++; acc -= DTv; }
      if (k > worst) worst = k;
    }
    return { t, steps, worst };
  }
  const smooth = new Array(600).fill(1 / 60);
  const hi     = new Array(1440).fill(1 / 144);
  const jitter = [];
  for (let i = 0; i < 300; i++) jitter.push(1 / 40, 1 / 120);

  say("  pattern         frames   steps        sim_t(s)   worst steps/frame");
  for (const [name, f] of [["smooth 60 Hz", smooth], ["144 Hz", hi],
                           ["jittery", jitter]]) {
    const r = accRun(f, MAX_FRAME);
    const ok = r.steps === 2400 && Math.abs(r.t - 10) < 1e-9;
    if (!ok) allPass = false;
    say("  " + (ok ? "PASS" : "FAIL") + "  " + name.padEnd(14) +
        String(f.length).padStart(7) + String(r.steps).padStart(8) +
        r.t.toFixed(10).padStart(16) + String(r.worst).padStart(16),
        ok ? "ok" : "bad");
  }

  const stall = new Array(300).fill(1 / 60);
  stall.push(2.0);
  for (let i = 0; i < 299; i++) stall.push(1 / 60);
  const c1 = accRun(stall, MAX_FRAME), c2 = accRun(stall, 1e9);
  say("");
  say("=== Why the frame-time clamp matters (one 2 s tab-switch) ===", "dim");
  say("  clamped at 0.25 s : worst frame = " + c1.worst + " steps, " +
      "sim_t = " + c1.t.toFixed(4) + " s", "ok");
  say("  NO clamp          : worst frame = " + c2.worst + " steps, " +
      "sim_t = " + c2.t.toFixed(4) + " s", "bad");

  say("");
  say(allPass
      ? "######  ALL CHECKS PASSED -- this port agrees with Python to 1e-9+  ######"
      : "######  SOME CHECKS FAILED -- see the FAIL rows above  ######",
      allPass ? "ok" : "bad");
}

// UI Event Listeners
document.getElementById("pause").addEventListener("click", (e) => {
  paused = !paused;
  e.target.textContent = paused ? "Resume" : "Pause";
  lastTime = performance.now() / 1000;
});

document.getElementById("reset").addEventListener("click", () => {
  resetSim();
  paused = false;
  document.getElementById("pause").textContent = "Pause";
});

document.getElementById("lag").addEventListener("click", () => {
  const delay = 500;
  const start = performance.now();

  while (performance.now() - start < delay) {
  }
});

for (const id of ["integrators", "scene", "dt", "C"]) {
  document.getElementById(id).addEventListener("change", () => {
    resetSim();
    paused = false;
    document.getElementById("pause").textContent = "Pause";
  });
}

document.getElementById("validate").addEventListener("click", validate);

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); document.getElementById("pause").click(); }
  if (e.key === "r" || e.key === "R") document.getElementById("reset").click();
});

// Start application
resetSim();
vec2SelfTest();
requestAnimationFrame(frame);