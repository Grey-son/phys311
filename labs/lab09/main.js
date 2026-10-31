import { Vec2 } from './engine/vec2.js';
import { Body } from './engine/body.js';
import { Gravity, Drag, NewtonianGravity, Spring } from './engine/forces.js';
import { Box, BodyCollisions } from './engine/constraints.js';
import { Euler, EulerCromer, VelocityVerlet } from './engine/integrators.js';
import { World } from './engine/world.js';
import { Camera } from './render/camera.js';
import { draw } from './render/renderer.js';

const G = 9.81;
let C = 0.01;
const MAX_FRAME = 0.25;

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

const sceneSelect = document.getElementById("scene");
const sceneOptionSelect = document.getElementById("sceneOption");
const sceneOptionLabel = document.getElementById("sceneOptionLabel");
const parameterControl = document.getElementById("parameterControl");

let dtDenom = 240;
let DT = 1 / dtDenom;
let world, hud, paused = false;
let accumulator = 0;
let lastTime = performance.now() / 1000;
let fpsEMA = 60;

const INTEGRATORS = {"euler": Euler, "euler-cromer": EulerCromer, "verlet": VelocityVerlet};

// Scene selection
const SCENES = {
  projectile: buildProjectileDrag,
  static: buildStatic,
  orbit: buildOrbit,
  billiards: buildBilliards,
  unique: buildUnique
};

// Options displayed for each scene.
const SCENE_OPTIONS = {
  projectile: [
    { label: "Quad Drag", value: "qDrag" },
    { label: "Lin Drag", value: "lDrag"}],
  static: [
    { label: "Single Body", value: "single" }],
  orbit: [
    { label: "Binary", value: "binary" },
    { label: "Figure 8", value: "figure8" },
    { label: "Nested Binary", value: "nest"}],
  billiards: [
    { label: "8 Ball", value: "8ball" },
    { label: "9 Ball", value: "9ball" },
    { label: "Bumper", value: "bumper"}],
  unique: [
    { label: "Default Setup", value: "default" }]
};

// Label displayed beside the scene-options dropdown.
const SCENE_LABELS = {
  projectile: "Drag Coeff",
  static: "Static Options",
  orbit: "Orbit Options",
  billiards: "Billiards Options",
  unique: "Unique Options"
};

const PARAMETER_LABELS = {
  projectile: "Coefficient Value",
  static: "",
  orbit: "",
  billiards: "",
  unique: ""
};

// Scene option dropdown
function updateSubOptions() {
  const scene = sceneSelect.value;
  const options = SCENE_OPTIONS[scene] ?? [];

  sceneOptionLabel.textContent =
    SCENE_LABELS[scene] ?? "Scene Options";

  // Hide the numeric parameter input for other scenes.
  parameterControl.hidden = !PARAMETER_LABELS[scene];

  // Update the numeric input's label.
  const parameterLabel = document.getElementById("parameterLabel");
  parameterLabel.textContent = PARAMETER_LABELS[scene] ?? "";

  // Remove the previous scene's options.
  sceneOptionSelect.replaceChildren();

  // Populate the options for the current scene.
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    sceneOptionSelect.appendChild(element);
  }
}

// Scene Builders
function buildProjectileDrag(integratorName, optionName) {
  const w = new World(INTEGRATORS[integratorName]);
  const v0 = 20, th = 50 * Math.PI / 180;
  let quad = true;
  if (optionName === "lDrag") {quad = false}
  w.add(new Body({
    mass: 1, radius: 0.35, color: "#ff8200",
    pos: new Vec2(0, 0),
    vel: new Vec2(v0 * Math.cos(th), v0 * Math.sin(th))
  }));
  w.addForce(new Gravity(G));
  w.addForce(new Drag(C, quad));
  w.primeAccelerations();
  w.meta = { kind: "projectile", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5, 
    trail: true, trailLen: 200 };
  return w;
}

function buildStatic(integratorName, optionName) {
  const w = new World(INTEGRATORS[integratorName]);
  w.add(new Body({
    mass: 1, radius: 0.3, color: "#ff8200",
    pos: new Vec2(2, 3),
  }));
  w.meta = { kind: "static", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 1, 
    trail: true, trailLen: 200 };
  return w;
}

function buildOrbit(integratorName, optionName) {
  const w = new World(INTEGRATORS[integratorName]);
  w.addForce(new NewtonianGravity(100, 0))
  if (optionName === "binary") {
    w.add(new Body({
      mass: 4, radius: 0.8, color: "#2b00ff",
      pos: new Vec2(27.5, 10), vel: new Vec2(3,0)
    }));
    w.add(new Body({
      mass: 4, radius: 0.8, color: "#ff8200",
      pos: new Vec2(27.5, 22), vel: new Vec2(-3,0)
    }));
  } else if (optionName === "figure8") {
    w.add(new Body({
      mass: 1, radius: 0.8, color: "#2b00ff",
      pos: new Vec2(30.0, 16.246977), vel: new Vec2(2.053426, 1.904378)

    }));
    w.add(new Body({
      mass: 1, radius: 0.8, color: "#ff8200",
      pos: new Vec2(20, 18.753023), vel: new Vec2(2.053426, 1.904378)
    }));
    w.add(new Body({
      mass: 1, radius: 0.8, color: "#ffbf00",
      pos: new Vec2(25,17.5), vel: new Vec2(-4.106852, -3.808756)
    }))
  } else if (optionName === "nest") {
    w.add(new Body({
      mass: 1, radius: 0.5, color: "#2b00ff",
      pos: new Vec2(11, 17.5), vel: new Vec2(0,5.5768)
    }));
    w.add(new Body({
      mass: 1, radius: 0.5, color: "#8400ff",
      pos: new Vec2(15, 17.5), vel: new Vec2(0,-1.4943)
    }));
    w.add(new Body({
      mass: 1, radius: 0.5, color: "#ff0000",
      pos: new Vec2(35, 17.5), vel: new Vec2(0,1.4943)
    }));
    w.add(new Body({
      mass: 1, radius: 0.5, color: "#ff8200",
      pos: new Vec2(39, 17.5), vel: new Vec2(0,-5.5768)
    }));
  }
  w.meta = { kind: "orbits", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5, 
    trail: true, trailLen: 2200 };
  return w;
}

function buildBilliards(integratorName, optionName) {
  const w = new World(INTEGRATORS[integratorName]);
  w.addConstraint(new Box([5,55], [3,28]));
  w.addConstraint(new BodyCollisions());
  if (optionName === "8ball") {
    w.add(new Body({
      mass: 1, radius: 1, color: "#e6e1db",
      pos: new Vec2(15, 15.5), vel: new Vec2(10,0)
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff0000",
      pos: new Vec2(38.5, 15.5), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#00a2ff",
      pos: new Vec2(40.1, 16.5), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#fffb00",
      pos: new Vec2(40.1, 14.5), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff8200",
      pos: new Vec2(42.1, 17.1), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#000000",
      pos: new Vec2(42.1, 15.5), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff00b3",
      pos: new Vec2(42.1, 13.9), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff6a6a",
      pos: new Vec2(43.75, 18.6), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#52331d",
      pos: new Vec2(43.75, 16.55), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#00d0ff",
      pos: new Vec2(43.75, 14.45), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#09ff00",
      pos: new Vec2(43.75, 12.4), vel: new Vec2()
    }));
  } else if (optionName === "9ball") {
    w.add(new Body({
      mass: 1, radius: 1, color: "#e6e1db",
      pos: new Vec2(15, 15.5), vel: new Vec2(10,0)
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff0000",
      pos: new Vec2(38.5, 15.5), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#00a2ff",
      pos: new Vec2(40.1, 16.5), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#fffb00",
      pos: new Vec2(40.1, 14.5), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff8200",
      pos: new Vec2(42.1, 17.1), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#000000",
      pos: new Vec2(42.1, 15.5), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff00b3",
      pos: new Vec2(42.1, 13.9), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#52331d",
      pos: new Vec2(43.75, 16.55), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#00d0ff",
      pos: new Vec2(43.75, 14.45), vel: new Vec2()
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#09ff00",
      pos: new Vec2(45.8, 15.5), vel: new Vec2()
    }));
  } else if (optionName === "bumper") {
    w.add(new Body({
      mass: 1, radius: 1, color: "#e6e1db",
      pos: new Vec2(15, 15.5), vel: new Vec2(10,0.3)
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#e6e1db",
      pos: new Vec2(45, 15.5), vel: new Vec2(-13,.1)
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff0000",
      pos: new Vec2(32, 15.5), fixed: true
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff0000",
      pos: new Vec2(28, 15.5), fixed: true
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff0000",
      pos: new Vec2(30, 17.5), fixed: true
    }));
    w.add(new Body({
      mass: 1, radius: 1, color: "#ff0000",
      pos: new Vec2(30, 13.5), fixed: true
    }));
    w.add(new Body({
      mass: 1, radius: 0.3, color: "#ffffff",
      pos: new Vec2(32, 15.5), fixed: true
    }));
    w.add(new Body({
      mass: 1, radius: 0.3, color: "#ffffff",
      pos: new Vec2(28, 15.5), fixed: true
    }));
    w.add(new Body({
      mass: 1, radius: 0.3, color: "#ffffff",
      pos: new Vec2(30, 17.5), fixed: true
    }));
    w.add(new Body({
      mass: 1, radius: 0.3, color: "#ffffff",
      pos: new Vec2(30, 13.5), fixed: true
    }));
  }
  w.meta = { kind: "billiards", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5, trail: false };
  return w;
}

function buildUnique(integratorName, optionName) {
    const w = new World(INTEGRATORS[integratorName]);
  w.add(new Body({
    mass: 1, radius: 0.3, color: "#ff8200",
    pos: new Vec2(2, 3),
  }));
  w.meta = { kind: "unique", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5, trail: true };
  return w;
}

function buildScene(sceneName, integratorName, optionName) {
  return SCENES[sceneName](integratorName, optionName)
}

function resetSim() {
  const scene = document.getElementById("scene").value
  const method = document.getElementById("integrators").value;
  const option = sceneOptionSelect.value;

  dtDenom = parseInt(document.getElementById("dt").value, 10);
  C = parseFloat(document.getElementById("C").value, 10)
  DT = 1 / dtDenom;

  world = buildScene(scene, method, option);
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

    // Fixed timestep: use the accumulator
    accumulator += frameTime;

    while (accumulator >= DT) {
      world.step(DT);
      accumulator -= DT;
      n++;

      if (world.steps % 4 === 0 && world.meta.trail) {
      for (const b of world.bodies) {
        b.trail.push(b.pos.clone());
        if (b.trail.length > world.meta.trailLen) b.trail.shift();
      }
      }

      const b = world.bodies[0];
      if (
        (world.meta.kind === "projectile") &&
        b.pos.y < 0
      ) {
        paused = true;
        document.getElementById("pause").textContent = "Resume";
        break;
      }
    }
  }
  hud.lastSteps = n;

  draw(ctx, canvas, world, hud);
  requestAnimationFrame(frame);
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

sceneSelect.addEventListener("change", () => {
  updateSubOptions();
  resetSim();
  paused = false;
  document.getElementById("pause").textContent = "Pause";
});

sceneOptionSelect.addEventListener("change", () => {
  resetSim();
  paused = false;
  document.getElementById("pause").textContent = "Pause";
});

for (const id of ["integrators", "dt", "C"]) {
  document.getElementById(id).addEventListener("change", () => {
    resetSim();
    paused = false;
    document.getElementById("pause").textContent = "Pause";
  });
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); document.getElementById("pause").click(); }
  if (e.key === "r" || e.key === "R") document.getElementById("reset").click();
});

// Start application
updateSubOptions();
resetSim();
requestAnimationFrame(frame);