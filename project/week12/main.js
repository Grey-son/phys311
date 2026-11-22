import { Vec2 } from "./engine/vec2.js";
import { Body } from "./engine/body.js";
import { World } from "./engine/world.js";
import { VelocityVerlet } from "./engine/verlet.js";
import { Flag } from "./engine/flag.js";
import {NewtonianGravity, SlingshotForce, SlidingFriction} from "./engine/forces.js";
import { BodyCollisions } from "./engine/collisions.js";

import { Camera } from "./render/camera.js";
import {drawGhostTrajectory} from "./render/renderer.js";
import { drawHud } from "./render/hud.js";

import {getControls,updateReadout} from "./ui/controls.js";
import { bindKeyboard } from "./ui/keyboard.js";
import { bindPointer } from "./ui/pointer.js";
import { createScreenManager } from "./ui/screens.js";

import { levels, getLevel, getNextLevel } from "./levels/index.js";

// UI

const { canvas, ctx, readout } = getControls();

const screens = createScreenManager(levels);

let currentLevel = null;
let gameActive = false;

// Parameters
const DT = 1 / 240;
const MAX_FRAME = 0.1;

// State
let world;
let projectile;
let flag;
let sling;
let camera;

let strokes = 0;
let won = false;

let initialEnergy = 0;
let fps = 0;
let fpsLastTime = null;

let accumulator = 0;
let lastTime = performance.now() / 1000;

let paused = false;
let dragging = false;

let pointerWorld = null;
let pullVector = new Vec2();

let ghostTrajectory = [];

// World initialization
function resetWorld(level = currentLevel) {

    if (!level) return;

    currentLevel = level;

    strokes = 0;
    won = false;

    document.getElementById("win-overlay").classList.remove("visible");

    document.getElementById("stroke-count").textContent = "Strokes: 0";

    world = new World(VelocityVerlet);

    // Create level bodies
    for (const data of level.bodies) {
        const body = new Body({...data,pos: new Vec2(...data.pos)});
        world.add(body);
    }

    // Create projectile
    projectile = new Body({
        ...level.projectile,

        pos: new Vec2(...level.projectile.pos),
        vel: new Vec2(...level.projectile.vel)
    });

    world.add(projectile);

    // Create goal
    flag = new Flag({
        pos: new Vec2(...level.flag.pos),
        radius: level.flag.radius
    });
    
    // Physics configuration
    const physics = level.physics;

    world.addForce(
        new NewtonianGravity(
            physics.G,
            physics.softening
        )
    );

    sling = new SlingshotForce({
        ...level.slingshot
    });

    world.addForce(sling);

    world.addForce(new SlidingFriction());

    world.addConstraint(
        new BodyCollisions(
            physics.restitution,
            physics.collisionEps
        )
    );

    // Camera and simulation initialization
    world.meta = {
        camera: new Camera(1, 0, 0)
    };

    world.primeAccelerations();

    initialEnergy = world.totalEnergy();

    accumulator = 0;
    fps = 0;
    fpsLastTime = null;

    dragging = false;
    paused = false;

    pullVector = new Vec2();

    pointerWorld = null;
    ghostTrajectory = [];

    lastTime = performance.now() / 1000;

    resizeCanvas();

    updateUI();
}

// UI updates

function updateUI() {

    updateReadout(readout, {
        paused,
        dragging,
        projectile,
        pullVector,
        strokes,
        won

    });
}

// Goal and stroke-count logic

function updateStrokeDisplay() {
    document.getElementById("stroke-count").textContent = `Strokes: ${strokes}`;
}

function checkWin() {

    if (won || !flag.isTouchedBy(projectile)) {return;}

    won = true;
    paused = true;
    dragging = false;

    ghostTrajectory = [];

    // Unlock the next level.
    screens.completeLevel(currentLevel.id);

    document.getElementById("win-message").textContent =
        `Completed ${currentLevel.name} in ${strokes} ${
            strokes === 1 ? "stroke" : "strokes"
        }.`;

    const next = getNextLevel(currentLevel.id);

    const nextButton = document.getElementById("next-level-button");

    nextButton.disabled = !next || !screens.isUnlocked(next.id);

    nextButton.textContent = next ? "NEXT LEVEL" : "ALL LEVELS COMPLETE";

    document.getElementById("win-overlay").classList.add("visible");

    updateUI();
}

// Camera

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
        width / currentLevel.world.width,
        height / currentLevel.world.height
    );

    camera.originX = width / 2;
    camera.originY = height / 2;
}

// Ghost trajectory simulation

function simulateGhostTrajectory() {

    if (
        !dragging ||
        !pullVector ||
        pullVector.length() === 0
    ) {
        ghostTrajectory = [];
        return;
    }

    // Number of steps is specific to the selected level.
    const ghostSteps = Math.max(1,Math.round(currentLevel.ghostDuration / DT));

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
    previewProjectile.invMass = 1 / previewProjectile.mass;

    // Apply the exact impulse that would be applied on release.
    const impulse = sling.impulseForPull(pullVector);

    previewProjectile.vel.addScaled(previewProjectile.invMass,impulse);

    // Recreate the level's physics.
    const physics = currentLevel.physics;

    previewWorld.addForce(
        new NewtonianGravity(physics.G,physics.softening)
    );

    previewWorld.addForce(new SlidingFriction());

    previewWorld.addConstraint(
        new BodyCollisions(physics.restitution,physics.collisionEps)
    );

    previewWorld.primeAccelerations();

    // Initial position.
    const points = [previewProjectile.pos.clone()];

    // Simulate future trajectory.
    for (let i = 0; i < ghostSteps; i++) {

        previewWorld.step(DT);

        points.push(previewProjectile.pos.clone());
    }

    ghostTrajectory = points;
}

function getGravityInfo() {

    let gx = 0;
    let gy = 0;

    // Calculate the gravitational acceleration
    // experienced by the projectile.

    for (const source of world.bodies) {

        if (source === projectile) continue;

        const d = source.pos.sub(projectile.pos);
        const dist = d.length();

        if (dist === 0) continue;

        // Match the gravitational force equation
        // used in engine/forces.js.

        const { G, softening } = currentLevel.physics;
        const factor = G * source.mass / (dist ** 3 + softening ** 2);

        gx += factor * d.x;
        gy += factor * d.y;
    }

    // Magnitude of net gravitational acceleration.
    const magnitude = Math.hypot(gx, gy);

    // Angle measured counterclockwise from +x.
    const angle = magnitude === 0
        ? 0 : Math.atan2(gy, gx) * 180 / Math.PI;

    // Convert angle into a compass direction.
    const directions = [
        "E", "NE", "N", "NW",
        "W", "SW", "S", "SE"
    ];

    const index = ((Math.round(angle / 45) % 8) + 8) % 8;

    const direction = magnitude === 0
        ? "NONE" : directions[index];

    return {gx,gy,magnitude,angle,direction};
}

// Drawing: bodies

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

// Drawing: grid

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

function drawFlag() {
    if (!flag) return;

    const x = camera.toScreenX(flag.pos.x);
    const y = camera.toScreenY(flag.pos.y);
    const r = camera.toScreenLen(flag.radius);

    const time = performance.now() / 1000;

    ctx.save();

    // Black portal center
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#050509";
    ctx.fill();

    // Circular blue-purple perimeter
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
    ctx.strokeStyle = "#387bff";
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.stroke();

    // Spiral bands
    const colors = ["#55baff", "#7655ff", "#bd65ff"];

    for (let i = 0; i < 3; i++) {
        const startAngle = time * 0.8 + i * (Math.PI * 2 / 3);

        ctx.beginPath();

        for (let j = 0; j <= 100; j++) {
            const t = j / 100;
            const angle = startAngle + t * Math.PI * 2;
            const radius = r * (0.12 + t * 0.78);

            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;

            if (j === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }

        ctx.strokeStyle = colors[i];
        ctx.lineWidth = Math.max(1.5, r * 0.055);
        ctx.lineCap = "round";
        ctx.stroke();
    }

    // Dark center drawn over the inner spiral ends
    ctx.beginPath();
    ctx.arc(x, y, r * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();

    ctx.restore();
}

// Drawing: scene
function draw() {

    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // Ghost trajectory
    drawGhostTrajectory(ctx, camera, ghostTrajectory);

    drawSling();

    drawFlag();

    // Bodies
    for (const body of world.bodies) {drawBody(body);}

    // Title
    ctx.save();

    ctx.fillStyle = "#d4d4d4";
    ctx.font = `${Math.max(12, canvas.width / 95)}px system-ui`;

    ctx.fillText("Two-body gravity / slingshot test",18,30);

    ctx.restore();

    // Calculate current gravitational acceleration.
    const gravity = getGravityInfo();

    const distanceToFlag = Math.max(
        0,
        projectile.pos.sub(flag.pos).length()
            - projectile.radius
            - flag.radius
    );

    // Draw simulation HUD.
    drawHud(ctx, canvas, world, {

        E0: initialEnergy,

        strokes: strokes,
        par: currentLevel.par,
        distanceToFlag: distanceToFlag,

        gravityG: currentLevel.physics.G,
        gravityMagnitude: gravity.magnitude,
        gravityDirection: gravity.direction,
        gravityAngle: gravity.angle,

        paused: paused,
        fps: fps,

        dtDenom: Math.round(1 / DT)
    });
}

function startLevel(level) {

    if (!level) return;

    gameActive = true;

    screens.showGame();

    resetWorld(level);
}

// Pointer controls
bindPointer({

    canvas,

    getCamera: () => camera,
    getProjectile: () => projectile,
    getSling: () => sling,

    isDragging: () => dragging,
    isWon: () => won,

    setDragging: value => {dragging = value;},

    setPaused: value => {paused = value;},

    setPullVector: value => {pullVector = value;},

    getPullVector: () => pullVector,

    onChange: point => {

        pointerWorld = point;

        if (!dragging && pullVector.length() > 0 && !won) {

            strokes++;

            updateStrokeDisplay();

            pullVector = new Vec2();
        }

        simulateGhostTrajectory();

        updateUI();
    }
});

// Keyboard controls
bindKeyboard({

    isDragging: () => dragging,

    togglePaused: () => {

        if (!gameActive || won) return;

        paused = !paused;

        updateUI();
    },

    reset: () => {if (gameActive) {resetWorld(currentLevel);}}
});

// Main menu

document.getElementById("play-button")
    .addEventListener("click", () => {
        const first = screens.firstUnlocked();
        if (first) {startLevel(first);}
    });

document.getElementById("levels-button")
    .addEventListener("click", () => {
        screens.renderLevelSelect(startLevel);
        screens.showLevelSelect();
    });

// Level selection
document.getElementById("back-menu")
    .addEventListener("click", () => {
        screens.showMainMenu();
    });

document.getElementById("game-levels")
    .addEventListener("click", () => {
        gameActive = false;
        screens.renderLevelSelect(startLevel);
        screens.showLevelSelect();
    });

// Game navigation
document.getElementById("restart-button")
    .addEventListener("click", () => {
        resetWorld(currentLevel);
    });

document.getElementById("game-menu")
    .addEventListener("click", () => {
        gameActive = false;
        screens.showMainMenu();
    });

// Victory screen navigation
document.getElementById("next-level-button")
    .addEventListener("click", () => {

        const next = getNextLevel(currentLevel.id);

        if (
            next &&
            screens.isUnlocked(next.id)
        ) {
            startLevel(next);
        }
    });

document.getElementById("win-levels-button")
    .addEventListener("click", () => {

        gameActive = false;

        screens.renderLevelSelect(startLevel);

        screens.showLevelSelect();
    });

document.getElementById("win-menu-button")
    .addEventListener("click", () => {

        gameActive = false;

        screens.showMainMenu();
    });

// Main run loop
function frame(nowMs) {
    // Measure actual rendered frame rate.
    if (fpsLastTime !== null) {
        const frameDelta = (nowMs - fpsLastTime) / 1000;
        // Ignore unusually long pauses, such as switching browser tabs.
        if (frameDelta > 0 && frameDelta < 0.25) {
            const instantaneousFPS = 1 / frameDelta;
            fps = fps === 0 ? instantaneousFPS : 0.9 * fps + 0.1 * instantaneousFPS;
        }
    }
    fpsLastTime = nowMs;

    const now = nowMs / 1000;

    const elapsed = Math.min(
        now - lastTime,
        MAX_FRAME
    );

    lastTime = now;

    if (gameActive && world) {

        if (!paused && !dragging && !won) {

            accumulator += elapsed;

            while (accumulator >= DT) {
                const previousPosition = projectile.pos.clone();
                world.step(DT);
                accumulator -= DT;
                checkWin(previousPosition);
                if (won) {accumulator = 0; break;}
            }
        }

        draw();

        updateUI();
    }

    requestAnimationFrame(frame);
}

// Initialization
screens.showMainMenu();

window.addEventListener("resize", () => {

    if (gameActive && world) {
        resizeCanvas();
    }
});

requestAnimationFrame(frame);