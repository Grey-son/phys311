import { Vec2 } from './engine/vec2.js';
import { Body } from './engine/body.js';
import { xWall, yWall, BodyCollisions } from './engine/constraints.js';
import { Euler, EulerCromer, VelocityVerlet } from './engine/integrators.js';
import { World } from './engine/world.js';

import { Camera } from './render/camera.js';
import { draw, drawSpeedHistogram } from './render/renderer.js';

import { createControls } from './ui/controls.js';
import { installKeyboardControls } from './ui/keyboard.js';
import { installPointerControls } from './ui/pointer.js';

const MAX_FRAME = 0.25;
const PRESSURE_WINDOW = 1.0;

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

const histogramCanvas = document.getElementById("speedHistogram");
const histogramCtx = histogramCanvas.getContext("2d");

const INTEGRATORS = {
  "euler": Euler,
  "euler-cromer": EulerCromer,
  "verlet": VelocityVerlet
};

let boxWidth = 50;
let boxHeight = 25;

let dtDenom = 240;
let DT = 1 / dtDenom;

let box;
let world;
let hud;

let paused = false;
let accumulator = 0;

let lastTime = performance.now() / 1000;
let fpsEMA = 60;

let pressureElapsed = 0;
let pressure = 0;

let nextHistogramUpdate = 1;

// UI setup

function setPaused(value) {
  paused = value;
  controls.setPaused(paused);
  lastTime = performance.now() / 1000;
}

function togglePause() {
  setPaused(!paused);
}

const controls = createControls({
  onReset: () => {
    resetSim();
    setPaused(false);
  },

  onPause: togglePause,

  onDimensionsChange: (values) => {
    boxWidth = values.boxWidth;
    boxHeight = values.boxHeight;

    if (box) {
      box.update(values);
    }
  }
});

installKeyboardControls({
  onPause: togglePause,
  onReset: () => {
    resetSim();
    setPaused(false);
  }
});

// Temperature

function kineticTemperature(world) {
  const bodies = world.bodies.filter(b => !b.fixed);
  const N = bodies.length;

  if (N <= 1) {
    return {
      temperature: 0,
      meanSpeed: 0,
      N
    };
  }

  let px = 0;
  let py = 0;
  let totalMass = 0;

  for (const b of bodies) {
    px += b.mass * b.vel.x;
    py += b.mass * b.vel.y;
    totalMass += b.mass;
  }

  const vxCM = px / totalMass;
  const vyCM = py / totalMass;

  let K = 0;
  let speedSum = 0;

  for (const b of bodies) {
    const vx = b.vel.x - vxCM;
    const vy = b.vel.y - vyCM;

    K += 0.5 * b.mass * (vx * vx + vy * vy);
    speedSum += b.vel.length();
  }

  // Two translational degrees of freedom per particle,
  // minus two for center-of-mass motion.
  const dof = 2 * N - 2;

  // kB = 1 in the simulation's chosen units.
  const temperature = 2 * K / dof;
  const meanSpeed = speedSum / N;

  return {temperature,meanSpeed,N};
}

// Particle generation

function generateBalls(world, n, x_ext, y_ext, r, vMin, vMax) {
  const maxAttempts = 1000;
  const placed = [];

  for (let i = 0; i < n; i++) {
    let success = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = x_ext[0] + r + Math.random() * (x_ext[1] - x_ext[0] - 2 * r);
      const y = y_ext[0] + r + Math.random() * (y_ext[1] - y_ext[0] - 2 * r);
      const overlap = placed.some(b => {
        const dx = x - b.pos.x;
        const dy = y - b.pos.y;

        return dx * dx + dy * dy < (2 * r) ** 2;
      });

      if (overlap) continue;

      const vx = vMin + Math.random() * (vMax - vMin);
      const vy = vMin + Math.random() * (vMax - vMin);

      const body = new Body({
        mass: 1,
        pos: new Vec2(x, y),
        vel: new Vec2(vx, vy),
        radius: r
      });

      world.add(body);
      placed.push(body);

      success = true;
      break;
    }

    if (!success) {
      console.warn(`Could only place ${i}/${n} particles.`);
      break;
    }
  }
}

// Simulation box

class Box {
  constructor(settings) {
    this.integratorName = settings.integrator;
    this.bodyCount = settings.bodyCount;

    this.build(settings);
  }
  build(settings) {
      this.xWall = new xWall(30, boxWidth, 1);
      this.yWall = new yWall(15.5, boxHeight, 1);

      const w = new World(INTEGRATORS[this.integratorName]);
      w.addConstraint(this.xWall);
      w.addConstraint(this.yWall);
      w.addConstraint(new BodyCollisions());

      generateBalls(w, this.bodyCount, [30 - boxWidth / 2, 30 + boxWidth / 2],
        [15.5 - boxHeight / 2, 15.5 + boxHeight / 2], 0.6, -10, 10);

      w.meta = {
        kind: "box",
        camera: new Camera(8.5, 900 / 2 - 30 * 8.5,520 / 2 + 15.5 * 8.5),
        yRef: 0,
        tickSpacing: 5,
        trail: settings.trail,
        trailLen: 10,
        velVec: settings.heading,
        w: boxWidth,
        h: boxHeight
      };

    this.w = w;
  }

  update(settings = controls.getValues()) {
    this.w.meta.trail = settings.trail;
    this.w.meta.velVec = settings.heading;
    this.xWall.w = boxWidth;
    this.yWall.h = boxHeight;
    this.w.meta.w = boxWidth;
    this.w.meta.h = boxHeight;
  }
}

// Reset

function resetSim() {
  const settings = controls.getValues();

  boxWidth = settings.boxWidth;
  boxHeight = settings.boxHeight;

  dtDenom = settings.dtDenom;
  DT = 1 / dtDenom;

  box = new Box(settings);
  world = box.w;

  pressureElapsed = 0;
  pressure = 0;

  accumulator = 0;
  nextHistogramUpdate = 1;

  hud = {E0: world.totalEnergy(), fps: 60, lastSteps: 0, method: settings.integrator,
    dtDenom, physTime: 0, renderTime: 0, N: world.bodies.length, A: boxWidth*boxHeight,
    temperature: 0, meanSpeed: 0, pressure: 0, gasRatio: 0
  };

  lastTime = performance.now() / 1000;

  // Draw the initial histogram immediately.
  drawSpeedHistogram(histogramCtx, histogramCanvas, world);
}

// Pressure diagnostics

function updatePressure() {
  pressureElapsed += DT;

  if (pressureElapsed >= PRESSURE_WINDOW) {
    const elapsed = pressureElapsed;

    const xImp = box.xWall.takeImpulses();
    const yImp = box.yWall.takeImpulses();

    const W = world.meta.w;
    const H = world.meta.h;

    const totalImpulse = xImp.left + xImp.right + yImp.bottom + yImp.top;

    const perimeter = 2 * (W + H);

    pressure = totalImpulse / (perimeter * elapsed);

    pressureElapsed = 0;
  }
}

// Pointer Controls

installPointerControls(
  canvas,
  () => world,
  ({ w, h }) => {
    boxWidth = w;
    boxHeight = h;

    // Synchronize the sliders.
    const widthInput = document.getElementById("boxWidth");
    const heightInput = document.getElementById("boxHeight");

    widthInput.value = w;
    heightInput.value = h;

    // Synchronize the slider labels.
    document.getElementById("boxWidthValue").textContent = `${w} m`;
    document.getElementById("boxHeightValue").textContent = `${h} m`;

    // Update the existing simulation without rebuilding particles.
    box.update();
  }
);

// Frame loop

function frame(nowMs) {
  const now = nowMs / 1000;

  let frameTime = now - lastTime;
  lastTime = now;

  if (frameTime > 0) {fpsEMA = 0.9 * fpsEMA + 0.1 / frameTime;}

  hud.fps = fpsEMA;

  frameTime = Math.min(frameTime, MAX_FRAME);

  let stepsThisFrame = 0;

  const physStart = performance.now();

  box.update();

  if (!paused) {
    accumulator += frameTime;

    while (accumulator >= DT) {
      world.step(DT);
      accumulator -= DT;
      stepsThisFrame++;

      updatePressure();

      if (world.steps % 4 === 0 && world.meta.trail) {
        for (const b of world.bodies) {
          b.trail.push(b.pos.clone());
          if (b.trail.length > world.meta.trailLen) {b.trail.shift();}
        }
      }
    }
  }

  hud.lastSteps = stepsThisFrame;
  hud.physTime = performance.now() - physStart;

  // Update diagnostics before rendering the HUD.
  const thermal = kineticTemperature(world);
  const A = world.meta.w * world.meta.h;

  hud.temperature = thermal.temperature;
  hud.meanSpeed = thermal.meanSpeed;
  hud.pressure = pressure;
  hud.N = thermal.N;
  hud.A = A;

  hud.gasRatio = thermal.temperature > 0 && thermal.N > 0
    ? pressure * A / (thermal.N * thermal.temperature)
    : NaN;

  // Main simulation rendering.
  const renderStart = performance.now();

  draw(ctx, canvas, world, hud);

  // Histogram updates once per simulated second.
  if (world.time >= nextHistogramUpdate) {
    drawSpeedHistogram(histogramCtx, histogramCanvas, world);
    nextHistogramUpdate = Math.floor(world.time) + 1;
  }

  hud.renderTime = performance.now() - renderStart;

  requestAnimationFrame(frame);
}

resetSim();
requestAnimationFrame(frame);