import { Vec2 } from './engine/vec2.js';
import { Body } from './engine/body.js';
import { Gravity, Drag, NewtonianGravity, Spring } from './engine/forces.js';
import { Box, BodyCollisions } from './engine/constraints.js';
import { Euler, EulerCromer, VelocityVerlet } from './engine/integrators.js';
import { World } from './engine/world.js';
import { Camera } from './render/camera.js';
import { draw } from './render/renderer.js';

const G = 9.81;
const MAX_FRAME = 0.25;

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

const sceneSelect = document.getElementById("scene");
const sceneOptionSelect = document.getElementById("sceneOption");
const sceneOptionLabel = document.getElementById("sceneOptionLabel");
const parameterControl = document.getElementById("parameterControl");
const parameterInput = document.getElementById("sceneParameter");
const parameterLabel = document.getElementById("parameterLabel");
const sceneOptionControl = document.getElementById("sceneOptionControl");

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
  orbit: buildOrbit,
  billiards: buildBilliards,
  box: buildBox,
  aniso: buildAniso
};

// Options displayed for each scene.
const SCENE_OPTIONS = {
  projectile: [
    { label: "Quad Drag", value: "qDrag" },
    { label: "Lin Drag", value: "lDrag"}],
  orbit: [
    { label: "Binary", value: "binary" },
    { label: "Figure 8", value: "figure8" },
    { label: "Nested Binary", value: "nest"}],
  billiards: [
    { label: "8 Ball", value: "8ball" },
    { label: "9 Ball", value: "9ball" },
    { label: "Bumper", value: "bumper"}],
  box: [],
  aniso: [
    { label: "1:1", value: 1 },
    { label: "2:1", value: 2 },
    { label: "3:1", value: 3 },
    { label: "5:1", value: 5 },
    { label: "7:1", value: 5 },
    { label: "PI:1", value: Math.PI },]
};

// Label displayed beside the scene-options dropdown.
const SCENE_LABELS = {
  projectile: "Drag Coeff",
  orbit: "Orbit Options",
  billiards: "Billiards Options",
  box: "Box Options",
  aniso: "Oscillator Options"
};

const SCENE_PARAMETERS = {
    projectile: {
        label: "Drag Coefficient",
        value: 0.01,
        min: 0,
        step: 0.001
    },

    billiards: {
      label: "Coefficient of Resitution",
      value: 1,
      min: 0,
      max: 1,
      step: 0.01
    },

    box: {
        label: "Number of Bodies",
        value: 20,
        min: 1,
        step: 1
    }
};

function updateSubOptions() {
  const scene = sceneSelect.value;
  const options = SCENE_OPTIONS[scene] ?? [];
  const parameter = SCENE_PARAMETERS[scene];

  sceneOptionLabel.textContent = SCENE_LABELS[scene] ?? "Scene Options";

  // Show/hide the scene-specific dropdown.
  sceneOptionControl.hidden = options.length === 0;

  // Show/hide the numeric parameter input.
  parameterControl.hidden = !parameter;

  if (parameter) {
    parameterLabel.textContent = parameter.label;

    parameterInput.value = parameter.value;
    parameterInput.min = parameter.min ?? "";
    parameterInput.max = parameter.max ?? "";
    parameterInput.step = parameter.step ?? "any";
  }

  // Rebuild the scene-specific dropdown.
  sceneOptionSelect.replaceChildren();

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    sceneOptionSelect.appendChild(element);
  }
}

// Scene Builders
function buildProjectileDrag(integratorName, optionName, dragCoefficient) {
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
  w.addForce(new Drag(dragCoefficient, quad));
  w.primeAccelerations();
  w.meta = { kind: "projectile", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5, 
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

function buildBilliards(integratorName, optionName, e) {
  const w = new World(INTEGRATORS[integratorName]);
  w.addConstraint(new Box([5,55], [3,28]));
  w.addConstraint(new BodyCollisions(e));
  if (optionName === "8ball") {
    w.add(new Body({
      mass: 1, radius: 1, color: "#e6e1db",
      pos: new Vec2(15, 15.5), vel: new Vec2(28,0)
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
  w.meta = { kind: "billiards", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5, 
    trail: true, trailLen: 20, velVec: true };
  return w;
}

function generateBalls(world, n, x_ext, y_ext, r, vMin, vMax) {
  const maxAttempts = 1000;
  const placed = [];

  for (let i = 0; i < n; i++) {
    let success = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = x_ext[0] + r + Math.random() * (x_ext[1] - x_ext[0] - 2*r);
      const y = y_ext[0] + r + Math.random() * (y_ext[1] - y_ext[0] - 2*r);

      // Check overlap with previously placed balls
      const overlap = placed.some(b => {
        const dx = x - b.pos.x;
        const dy = y - b.pos.y;
        return dx*dx + dy*dy < (2*r)**2;
      });

      if (overlap) continue;

      const vx = vMin + Math.random() * (vMax - vMin);
      const vy = vMin + Math.random() * (vMax - vMin);

      const body = new Body({mass: 1, pos: new Vec2(x, y), vel: new Vec2(vx, vy), radius: r});

      world.add(body);
      placed.push(body);

      success = true;
      break;
    }

    if (!success) {
      console.warn(`Could only place ${i}/${n} balls.`);
      break;
    }
  }
}

function buildBox(integratorName, optionName, bodyCount) {
  const w = new World(INTEGRATORS[integratorName]);
  w.addConstraint(new Box([5,55], [3,28]));
  w.addConstraint(new BodyCollisions());
  generateBalls(w, Math.max(1, Math.floor(bodyCount)), [5,55], [3,28], 0.6, -10, 10);
  w.meta = { kind: "box", camera: new Camera(13, 60, 470), yRef: 0, tickSpacing: 5, 
    trail: true, trailLen: 10 };
  return w;
}

function buildAniso(integratorName, optionName) {
  const w = new World(INTEGRATORS[integratorName]);
  const B = new Body({
    mass: 1, radius: 0.6, color: "#00f7ff",
    pos: new Vec2(7,7)
  });
  const A1 = new Body({
    mass: 1, radius: 0.3, color: "#000000",
    pos: new Vec2(10, 0), fixed: true
  });
  const A2 = new Body({
    mass: 1, radius: 0.3, color: "#000000",
    pos: new Vec2(0, 10), fixed: true
  });
  const A3 = new Body({
    mass: 1, radius: 0.3, color: "#000000",
    pos: new Vec2(-10, 0), fixed: true
  });
  const A4 = new Body({
    mass: 1, radius: 0.3, color: "#000000",
    pos: new Vec2(0, -10), fixed: true
  });
  w.add(B); w.add(A1); w.add(A2); w.add(A3); w.add(A4);
  w.addForce(new Spring(B, A1, 1, 10)); w.addForce(new Spring(B, A2, optionName, 10));
  w.addForce(new Spring(B, A3, 1, 10)); w.addForce(new Spring(B, A4, optionName, 10));
  w.meta = { kind: "unique", camera: new Camera(20, 450, 250), yRef: 0, tickSpacing: 5, 
    trail: true, trailLen: 4000 };
  return w;
}

function buildScene(sceneName, integratorName, optionName, parameterValue) {
  return SCENES[sceneName](integratorName, optionName, parameterValue)
}

function resetSim() {
  const scene = document.getElementById("scene").value
  const method = document.getElementById("integrators").value;
  const option = sceneOptionSelect.value;

  dtDenom = parseInt(document.getElementById("dt").value, 10);

  const configuredParameter = SCENE_PARAMETERS[scene];
  const enteredParameter = Number(parameterInput.value);

  const parameterValue = Number.isFinite(enteredParameter) ? enteredParameter : (configuredParameter?.value ?? 0);

  DT = 1 / dtDenom;

  world = buildScene(scene, method, option, parameterValue);
  hud = { E0: world.totalEnergy(), fps: 60, lastSteps: 0,
          method: method, dtDenom: dtDenom, physTime: 0,
          renderTime: 0 };
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
  const physStart = performance.now()
  if (!paused) {

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
  const physTime = performance.now() - physStart
  hud.lastSteps = n;

  const renderStart = performance.now()
  draw(ctx, canvas, world, hud);
  const renderTime = performance.now() - renderStart
  hud.physTime = physTime
  hud.renderTime = renderTime
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

for (const id of ["integrators", "dt", "sceneParameter"]) {
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