import { Vec2 } from "./engine/vec2.js";
import { Body } from "./engine/body.js";
import { World } from "./engine/world.js";
import { VelocityVerlet } from "./engine/verlet.js";

import {NewtonianGravity, SlingshotForce} from "./engine/forces.js";

import { BodyCollisions } from "./engine/collisions.js";
import { Camera } from "./render/camera.js";

import {
    drawGhostTrajectory
} from "./render/renderer.js";

import {
    getControls,
    updateReadout
} from "./UI/control.js";

import { bindKeyboard } from "./UI/keyboard.js";
import { bindPointer } from "./UI/pointer.js";


// --------------------------------------------------
// UI
// --------------------------------------------------

const { canvas, ctx, readout } = getControls();


// --------------------------------------------------
// Parameters
// --------------------------------------------------

const G = 0.8;
const SOFTENING = 0.35;

const DT = 1 / 240;
const MAX_FRAME = 0.1;

const WORLD_WIDTH = 42;
const WORLD_HEIGHT = 26;

// Ghost simulation duration.
const GHOST_DURATION = 3.0;
const GHOST_STEPS = Math.round(GHOST_DURATION / DT);


// --------------------------------------------------
// State
// --------------------------------------------------

let world;
let projectile;
let sling;
let camera;

let accumulator = 0;
let lastTime = performance.now() / 1000;

let paused = false;
let dragging = false;

let pointerWorld = null;
let pullVector = new Vec2();

let ghostTrajectory = [];


// --------------------------------------------------
// World initialization
// --------------------------------------------------

function resetWorld() {

    world = new World(VelocityVerlet);

    const planet1 = new Body({
        mass: 1200,
        pos: new Vec2(-10, 0),
        radius: 5.4,
        color: "#d9a441",
        fixed: true
    });

    const planet2 = new Body({
        mass: 900,
        pos: new Vec2(10, 0),
        radius: 7.0,
        color: "#6ca6d9",
        fixed: true
    });

    projectile = new Body({
        mass: 1,
        pos: new Vec2(0, 9),
        vel: new Vec2(-10, 0),
        radius: 0.55,
        color: "#f48771"
    });

    world.add(planet1);
    world.add(planet2);
    world.add(projectile);

    world.addForce(
        new NewtonianGravity(G, SOFTENING)
    );

    sling = new SlingshotForce({
        strength: 18,
        maxPull: 8,
        duration: 0.18
    });

    world.addForce(sling);

    world.addConstraint(
        new BodyCollisions(0.8, 0.4)
    );

    world.meta = {
        camera: new Camera(1, 0, 0)
    };

    world.primeAccelerations();

    accumulator = 0;

    dragging = false;
    pullVector = new Vec2();

    pointerWorld = null;
    ghostTrajectory = [];

    paused = false;

    lastTime = performance.now() / 1000;

    updateUI();
}


// --------------------------------------------------
// UI updates
// --------------------------------------------------

function updateUI() {

    updateReadout(readout, {
        paused,
        dragging,
        projectile,
        pullVector
    });
}


// --------------------------------------------------
// Camera
// --------------------------------------------------

function resizeCanvas() {

    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(
        1,
        Math.round(window.innerWidth * dpr)
    );

    const height = Math.max(
        1,
        Math.round(window.innerHeight * dpr)
    );

    if (
        canvas.width !== width ||
        canvas.height !== height
    ) {
        canvas.width = width;
        canvas.height = height;
    }

    camera = world.meta.camera;

    camera.scale = Math.min(
        width / WORLD_WIDTH,
        height / WORLD_HEIGHT
    );

    camera.originX = width / 2;
    camera.originY = height / 2;
}


// --------------------------------------------------
// Ghost trajectory simulation
// --------------------------------------------------

function simulateGhostTrajectory() {

    if (
        !dragging ||
        !pullVector ||
        pullVector.length() === 0
    ) {
        ghostTrajectory = [];
        return;
    }

    // Create an independent preview world.
    const previewWorld = new World(VelocityVerlet);

    const bodyMap = new Map();


    // Clone all bodies.
    for (const body of world.bodies) {

        const copy = body.clone();

        copy.fixed = body.fixed;
        copy.invMass = body.fixed ? 0 : 1 / body.mass;

        previewWorld.add(copy);

        bodyMap.set(body, copy);
    }


    // Retrieve the cloned projectile.
    const previewProjectile = bodyMap.get(projectile);

    previewProjectile.fixed = false;
    previewProjectile.invMass =
        1 / previewProjectile.mass;


    // Apply the prospective slingshot impulse.
    // This uses the exact same impulse calculation
    // as the actual release.

    previewProjectile.vel.addScaled(
        previewProjectile.invMass,
        sling.impulseForPull(pullVector)
    );


    // Recreate the forces and constraints.
    previewWorld.addForce(
        new NewtonianGravity(G, SOFTENING)
    );

    previewWorld.addConstraint(
        new BodyCollisions(0.8, 0.4)
    );

    previewWorld.primeAccelerations();


    // Store the simulated positions.
    const points = [
        previewProjectile.pos.clone()
    ];


    // Simulate the projectile's future trajectory.
    for (let i = 0; i < GHOST_STEPS; i++) {

        previewWorld.step(DT);

        points.push(
            previewProjectile.pos.clone()
        );
    }

    ghostTrajectory = points;
}


// --------------------------------------------------
// Drawing: bodies
// --------------------------------------------------

function drawBody(body) {

    const x = camera.toScreenX(body.pos.x);
    const y = camera.toScreenY(body.pos.y);

    const radius = Math.max(
        2,
        camera.toScreenLen(body.radius)
    );

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = body.color;
    ctx.fill();

    ctx.lineWidth = Math.max(
        1,
        canvas.width / 1200
    );

    ctx.strokeStyle = "#e5e7eb";
    ctx.stroke();
}


// --------------------------------------------------
// Drawing: grid
// --------------------------------------------------

function drawGrid() {

    ctx.save();

    ctx.strokeStyle = "#30343b";
    ctx.lineWidth = 1;

    const left = camera.toWorldX(0);
    const right = camera.toWorldX(canvas.width);

    const bottom = camera.toWorldY(canvas.height);
    const top = camera.toWorldY(0);


    for (
        let x = Math.ceil(left / 2) * 2;
        x <= right;
        x += 2
    ) {

        const px = camera.toScreenX(x);

        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();
    }


    for (
        let y = Math.ceil(bottom / 2) * 2;
        y <= top;
        y += 2
    ) {

        const py = camera.toScreenY(y);

        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
    }

    ctx.restore();
}

// Drawing: slingshot

function drawSling() {

    if (!dragging || !pointerWorld) return;

    const x1 = camera.toScreenX(projectile.pos.x);
    const y1 = camera.toScreenY(projectile.pos.y);

    const x2 = camera.toScreenX(pointerWorld.x);
    const y2 = camera.toScreenY(pointerWorld.y);

    ctx.save();

    ctx.strokeStyle = "#f48771";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f48771";

    ctx.beginPath();
    ctx.arc(x2,y2,5,0,Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Drawing: scene

function draw() {

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    drawGrid();

    // Ghost trajectory is rendered behind the bodies.
    drawGhostTrajectory(ctx,camera,ghostTrajectory);

    drawSling();

    for (const body of world.bodies) {drawBody(body);}

    ctx.save();

    ctx.fillStyle = "#d4d4d4";

    ctx.font =`${Math.max(12, canvas.width / 95)}px system-ui`;
    ctx.fillText("Two-body gravity / slingshot test",18,30);
    ctx.restore();
}

// Pointer controls

bindPointer({

    canvas,

    getCamera: () => camera,
    getProjectile: () => projectile,
    getSling: () => sling,

    isDragging: () => dragging,

    setDragging: value => {dragging = value;},

    setPaused: value => {paused = value;},

    setPullVector: value => {pullVector = value;},

    getPullVector: () => pullVector,

    onChange: point => {

        pointerWorld = point;

        // Recalculate preview whenever the pull changes.
        simulateGhostTrajectory();

        updateUI();
    }
});

// Keyboard controls

bindKeyboard({
    isDragging: () => dragging,
    togglePaused: () => {paused = !paused; updateUI();},
    reset: resetWorld
});

// Main run loop

function frame(nowMs) {

    const now = nowMs / 1000;
    const elapsed = Math.min(now - lastTime, MAX_FRAME);

    lastTime = now;

    if (!paused && !dragging) {

        accumulator += elapsed;

        while (accumulator >= DT) {
            world.step(DT);
            accumulator -= DT;
        }
    }

    draw();
    updateUI();
    requestAnimationFrame(frame);
}


// Initialization

resetWorld();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(frame);