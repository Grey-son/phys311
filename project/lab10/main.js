import { Vec2 } from "./engine/vec2.js";
import { Body } from "./engine/body.js";
import {xWall, yWall, BodyCollisions} from "./engine/constraints.js";
import {Euler, EulerCromer, VelocityVerlet} from "./engine/integrators.js";
import { World } from "./engine/world.js";
import { Drag } from "./engine/forces.js";
import { Camera } from "./render/camera.js";
import {draw,drawSpeedHistogram} from "./render/renderer.js";
import { createControls } from "./ui/controls.js";
import {installKeyboardControls} from "./ui/keyboard.js";
import {installPointerControls, installBodyInteraction} from "./ui/pointer.js";

const MAX_FRAME = 0.25;
const PRESSURE_WINDOW = 1.0;

const INTEGRATORS = {
  "euler": Euler,
  "euler-cromer": EulerCromer,
  "verlet": VelocityVerlet
};

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");
const histogramCanvas = document.getElementById("speedHistogram");
const histogramCtx = histogramCanvas.getContext("2d");
const pointerReadout = document.getElementById("pointerReadout");

let boxWidth = 50;
let boxHeight = 25;
let boxCenterX = 30;
let boxCenterY = 15.5;

let dtDenom = 240;
let DT = 1 / dtDenom;
let simulationSpeed = 1;

let box;
let world;
let hud;

let paused = false;
let accumulator = 0;
let pendingSingleSteps = 0;

let lastTime = performance.now() / 1000;

let fpsEMA = 60;

let pressureElapsed = 0;
let pressure = 0;

let nextHistogramUpdate = 1;

let cursorWorld = null;

function eventToWorld(event) {

  const rect = canvas.getBoundingClientRect();

  const screenX = (event.clientX - rect.left) * canvas.width / rect.width;
  const screenY = (event.clientY - rect.top) * canvas.height / rect.height;
  const camera = world.meta.camera;

  return new Vec2(camera.toWorldX(screenX), camera.toWorldY(screenY));
}

canvas.addEventListener("pointermove", event => {
  if (!world) return;

  cursorWorld = eventToWorld(event);

  pointerReadout.textContent =
    `Physics coordinates: ` +
    `x = ${cursorWorld.x.toFixed(3)} m, ` +
    `y = ${cursorWorld.y.toFixed(3)} m`;
});


canvas.addEventListener("pointerleave", () => {
  cursorWorld = null;
  pointerReadout.textContent = "Cursor: outside canvas";
});

function setPaused(value) {
  paused = value;
  if (paused) {accumulator = 0;}
  controls.setPaused(paused);
  lastTime = performance.now() / 1000;
}

function togglePause() {setPaused(!paused);}

function requestSingleStep() {
  if (!paused) {setPaused(true);}
  pendingSingleSteps++;
}

const controls = createControls({
  onReset: () => {
    resetSim();

    setPaused(false);
  },

  onPause: togglePause,

  onStep: requestSingleStep,

  onDimensionsChange: values => {
    boxWidth = values.boxWidth;
    boxHeight = values.boxHeight;
    simulationSpeed = values.speed;
    if (box) {box.update(values);}
  }
});

installKeyboardControls({
  onPause: togglePause,
  onReset: () => {resetSim(); setPaused(false);},
  onStep: requestSingleStep,
  onSpeedChange: amount => {

    const slider = document.getElementById("speed");
    const next = Math.max(0.25,Math.min(2,parseFloat(slider.value) + amount));

    slider.value = next;
    slider.dispatchEvent(new Event("input"));
  }
});

function kineticTemperature(world) {

  const bodies = world.bodies.filter(b => !b.fixed);
  const N = bodies.length;
  if (N <= 1) {
    return {temperature: 0, meanSpeed: 0, N};
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

  const dof = 2 * N - 2;
  const temperature = 2 * K / dof;
  const meanSpeed = speedSum / N;

  return {temperature, meanSpeed, N};
}

function generateBalls(world,n,x_ext,y_ext,r,vMin,vMax) {
  const maxAttempts = 1000;
  const placed = [];
  for (let i = 0; i < n; i++) {
    let success = false;

    for (let attempt = 0; attempt < maxAttempts;attempt++) {
      const x = x_ext[0] + r + Math.random() * (x_ext[1] - x_ext[0] - 2 * r);
      const y = y_ext[0] + r + Math.random() * (y_ext[1] - y_ext[0] - 2 * r);
      const overlap = placed.some(b => {
        const dx = x - b.pos.x;
        const dy = y - b.pos.y;
        return dx * dx + dy * dy < (2 * r) ** 2;
      });

      if (overlap) continue;

      const vx =vMin + Math.random() * (vMax - vMin);
      const vy =vMin + Math.random() * (vMax - vMin);

      const body = new Body({mass: 1,pos: new Vec2(x, y),vel: new Vec2(vx, vy),radius: r});

      world.add(body);
      placed.push(body);
      success = true;
      break;
    }

    if (!success) {
      console.warn(
        `Could only place ${i}/${n} particles.`
      );
      break;
    }
  }
}

class Box {
  constructor(settings) {
    this.integratorName = settings.integrator;
    this.bodyCount = settings.bodyCount;
    this.build(settings);
  }

  build(settings) {
    this.xWall = new xWall(
      boxCenterX,
      boxWidth,
      settings.wallRestitution
    );

    this.yWall = new yWall(
      boxCenterY,
      boxHeight,
      settings.wallRestitution
    );

    const w = new World(
      INTEGRATORS[this.integratorName]
    );

    w.addConstraint(this.xWall);
    w.addConstraint(this.yWall);
    this.collisions = new BodyCollisions(settings.collisionRestitution);
    w.addConstraint(this.collisions);

    this.drag = new Drag(settings.dragCoefficient,true);
    w.addForce(this.drag);

    generateBalls(
      w, this.bodyCount,
      [boxCenterX - boxWidth / 2, boxCenterX + boxWidth / 2],
      [boxCenterY - boxHeight / 2, boxCenterY + boxHeight / 2],
      0.6, -10, 10
    );

    w.meta = {
      kind: "box",
      camera: new Camera(
          8.5,
          900 / 2 - boxCenterX * 8.5,
          520 / 2 + boxCenterY * 8.5
      ),
      cx: boxCenterX,
      cy: boxCenterY,
      yRef: 0,
      tickSpacing: 5,
      trail: settings.trail,
      trailLen: 20,
      velVec: settings.heading,
      forceVec: settings.force,
      aimPreview: null,
      w: boxWidth,
      h: boxHeight
    };

    this.w = w;

    w.primeAccelerations();
  }

  update(settings = controls.getValues()) {
    this.w.meta.trail = settings.trail;
    this.w.meta.velVec = settings.heading;
    this.w.meta.forceVec = settings.force;

    this.xWall.Cx = boxCenterX;
    this.xWall.w = boxWidth;
    this.yWall.Cy = boxCenterY;
    this.yWall.h = boxHeight;

    this.w.meta.cx = boxCenterX;
    this.w.meta.cy = boxCenterY;
    this.w.meta.w = boxWidth;
    this.w.meta.h = boxHeight;

    this.xWall.e = settings.wallRestitution;
    this.yWall.e = settings.wallRestitution;
    this.collisions.e = settings.collisionRestitution;
    this.drag.c = settings.dragCoefficient;
  }
}

function resetSim() {

  const settings = controls.getValues();

  boxWidth = settings.boxWidth;
  boxHeight = settings.boxHeight;

  simulationSpeed = settings.speed;

  dtDenom = settings.dtDenom;
  DT = 1 / dtDenom;

  boxCenterX = 30;
  boxCenterY = 15.5;

  box = new Box(settings);
  world = box.w;
  resizeSimulationCanvas();

  pressureElapsed = 0;
  pressure = 0;

  accumulator = 0;
  pendingSingleSteps = 0;
  nextHistogramUpdate = 1;

  hud = {
    E0: world.totalEnergy(),
    fps: 60,
    lastSteps: 0,
    method: settings.integrator,
    dtDenom,
    physTime: 0,
    renderTime: 0,
    N: world.bodies.length,
    A: boxWidth * boxHeight,
    temperature: 0,
    meanSpeed: 0,
    pressure: 0,
    gasRatio: 0,
    speed: simulationSpeed,
    paused,
    cursorWorld: null,
    stepDelta: 0
  };

  lastTime = performance.now() / 1000;

  drawSpeedHistogram(histogramCtx, histogramCanvas, world);
}

function updatePressure() {
  pressureElapsed += DT;

  if (pressureElapsed >= PRESSURE_WINDOW) {
    const elapsed = pressureElapsed;

    const xImp = box.xWall.takeImpulses();
    const yImp = box.yWall.takeImpulses();

    const W = world.meta.w;
    const H = world.meta.h;

    const totalImpulse = xImp.left +  xImp.right + yImp.bottom + yImp.top;

    const perimeter = 2 * (W + H);

    pressure = totalImpulse / (perimeter * elapsed);
    pressureElapsed = 0;
  }
}

function updateTrails() {
  if (!world.meta.trail) return;

  for (const b of world.bodies) {
    b.trail.push(b.pos.clone());
    if (b.trail.length > world.meta.trailLen) {
      b.trail.shift();
    }
  }
}

installPointerControls(
  canvas, () => world,
  ({ cx, cy, w, h }) => {
    boxCenterX = cx;
    boxCenterY = cy;
    boxWidth = w;
    boxHeight = h;

    const widthInput =document.getElementById("boxWidth");
    const heightInput =document.getElementById("boxHeight");

    widthInput.value = w;
    heightInput.value = h;

    document.getElementById("boxWidthValue").textContent = `${w} m`;

    document.getElementById("boxHeightValue").textContent = `${h} m`;

    box.update();
  }
);

installBodyInteraction(canvas,() => world);

function resizeSimulationCanvas() {

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  if (rect.width <= 0 || rect.height <= 0) return;

  const width = Math.max(1,Math.round(rect.width * dpr));

  const height = Math.max(1,Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height
  ) {canvas.width = width; canvas.height = height;}

  if (!world) return;

  const maxWorldWidth = 83;
  const maxWorldHeight = 58;

  const scale = Math.min(width / maxWorldWidth,height / maxWorldHeight);

  const camera = world.meta.camera;
  camera.scale = scale;
  camera.originX =width / 2 - boxCenterX * scale;
  camera.originY =height / 2 + boxCenterY * scale;
}

const resizeObserver = new ResizeObserver(() => {resizeSimulationCanvas();});
resizeObserver.observe(canvas);
window.addEventListener("resize",resizeSimulationCanvas);

function frame(nowMs) {
  const now = nowMs / 1000;
  let frameTime = now - lastTime;
  lastTime = now;

  if (frameTime > 0) {fpsEMA = 0.9 * fpsEMA + 0.1 / frameTime;}

  hud.fps = fpsEMA;
  frameTime = Math.min(frameTime,MAX_FRAME);

  let stepsThisFrame = 0;
  const physStart = performance.now();

  box.update();

  if (pendingSingleSteps > 0) {
    const oldTime = world.time;
    world.step(DT);
    pendingSingleSteps--;

    const actualDelta = world.time - oldTime;
    hud.stepDelta = actualDelta - DT;
    stepsThisFrame++;

    updatePressure();
    updateTrails();

  }

  else if (!paused) {
    accumulator += frameTime * simulationSpeed;

    while (accumulator >= DT) {
      world.step(DT);
      accumulator -= DT;
      stepsThisFrame++;
      updatePressure();
      if (world.steps % 4 === 0) {updateTrails();}
    }
  }

  hud.lastSteps = stepsThisFrame;
  hud.physTime = performance.now() - physStart;

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

  hud.paused = paused;
  hud.speed = simulationSpeed;
  hud.cursorWorld = cursorWorld;

  const renderStart = performance.now();

  draw(ctx,canvas,world,hud);

  if (world.time >= nextHistogramUpdate) {

    drawSpeedHistogram(histogramCtx, histogramCanvas, world);

    nextHistogramUpdate = Math.floor(world.time) + 1;
  }

  hud.renderTime = performance.now() - renderStart;
  requestAnimationFrame(frame);
}

resetSim();
resizeSimulationCanvas();
requestAnimationFrame(frame);