import { Vec2 } from "./engine/vec2.js";
import { Body } from "./engine/body.js";
import { World } from "./engine/world.js";
import { VelocityVerlet } from "./engine/verlet.js";
import { NewtonianGravity, SlingshotForce } from "./engine/gravity.js";
import { BodyCollisions } from "./engine/collisions.js";
import { Camera } from "./render/camera.js";

const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");
const readout = document.getElementById("readout");

const G = 0.8;
const DT = 1 / 240;
const MAX_FRAME = 0.1;
const WORLD_WIDTH = 42;
const WORLD_HEIGHT = 26;

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

    world.addForce(new NewtonianGravity(G, 0.35));
    world.addForce(new SlingshotForce({strength: 18,maxPull: 8,duration: 0.18}));

    world.addConstraint(new BodyCollisions(0.8,0.4))

    world.meta = {
        camera: new Camera(1, 0, 0)
    };

    world.primeAccelerations();

    accumulator = 0;
    dragging = false;
    pullVector = new Vec2();

    paused = false;
    lastTime = performance.now() / 1000;

    updateReadout();
}

function resizeCanvas() {

    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(1,Math.round(window.innerWidth * dpr));
    const height = Math.max(1,Math.round(window.innerHeight * dpr));

    if (canvas.width !== width || canvas.height !== height
    ) {canvas.width = width; canvas.height = height;}

    const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);

    camera = world.meta.camera;

    camera.scale = scale;
    camera.originX = width / 2;
    camera.originY = height / 2;
}

function eventToWorld(event) {
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * canvas.width / rect.width;
    const py = (event.clientY - rect.top) * canvas.height / rect.height;
    return new Vec2(camera.toWorldX(px), camera.toWorldY(py));
}

function updateReadout() {

    const state = paused ? "paused" : "running";

    const speed = projectile.vel.length();

    readout.textContent =
        `Space: ${state}  |  R: reset  |  ` +
        `Projectile speed: ${speed.toFixed(2)}  |  ` +
        (
            dragging
                ? `Pull: ${pullVector.length().toFixed(2)}`
                : "Drag the small body to aim, release to launch"
        );
}

canvas.addEventListener("pointerdown", event => {

    if (event.button !== 0 || dragging) return;

    const point = eventToWorld(event);

    if (
        projectile.pos.sub(point).length() >
        projectile.radius + 0.35
    ) {return;}

    dragging = true;
    paused = false;

    projectile.fixed = true;
    projectile.invMass = 0;

    sling.begin(projectile);

    pullVector = new Vec2();

    canvas.setPointerCapture(event.pointerId);

    event.preventDefault();

    updateReadout();
});


canvas.addEventListener("pointermove", event => {

    pointerWorld = eventToWorld(event);

    if (!dragging) return;

    pullVector = pointerWorld.sub(projectile.pos);

    sling.setPull(pullVector);

    updateReadout();
});


function releasePointer() {

    if (!dragging) return;

    dragging = false;

    projectile.fixed = false;
    projectile.invMass = 1 / projectile.mass;

    sling.release(world.time);
    world.primeAccelerations();
    updateReadout();
}


canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);

window.addEventListener("keydown", event => {

    if (event.code === "Space") {
        event.preventDefault();
        if (!dragging) {paused = !paused;}
        updateReadout();
    } else if (event.key.toLowerCase() === "r") {resetWorld();}
});

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

function drawSling() {

    if (!dragging) return;

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
    ctx.arc(x2, y2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function draw() {

    ctx.fillStyle = "#1e1e1e";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawGrid();
    drawSling();

    for (const body of world.bodies) {drawBody(body);}

    ctx.save();
    ctx.fillStyle = "#d4d4d4";
    ctx.font = `${Math.max(12, canvas.width / 95)}px system-ui`;
    ctx.fillText("Two-body gravity / slingshot test",18,30);
    ctx.restore();
}

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
    updateReadout();
    requestAnimationFrame(frame);
}

resetWorld();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

requestAnimationFrame(frame);