import { Vec2 } from "./vec2.js";
import { Body, velocityVerlet, eulerCromer, Gravity, World } from "./engine.js";

// Find the canvas and get its drawing tool ("context")
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const scale = 10
const x_ext = canvas.width/scale
const y_ext = canvas.height/scale

function PostoScreen(vec) {
    return new Vec2(vec.x*scale,canvas.height-vec.y*scale)
}

function ValuetoScreen (value) {
    return value*scale
}

// ---- Simple animation: a bouncing ball ----
let x = 10, y = 12;      // position
let vx = 18, vy = 52;   // velocity in pixels per second
const r = 1.5;

const init_B1 = new Body(new Vec2(x,y), new Vec2(vx,vy), 1, r);
const gravity = new Gravity(500);
const init_world = new World(eulerCromer, 0.01, [init_B1], [gravity]);

let world = init_world.copy()

let lastTime = performance.now();

let reset = false
let running = true

document.getElementById("reset").addEventListener("click", ()=>{
    reset = true;
    running = true;
})
document.getElementById("pause").addEventListener("click", ()=>{
    running = !running
    if (running) {
        lastTime = performance.now();
    }
})

function frame(now) {
  const dt = (now - lastTime) / 1000;   // seconds since last frame
  lastTime = now;

  if (reset) {
    world = init_world.copy();
    reset = false;
  }

  const B1 = world.bodies[0];

  if (running) {
    world.step();

    // Bounce off the walls
    if (B1.pos.x - B1.radius < 0)  {
        B1.vel.x = -B1.vel.x
        B1.pos.x = B1.radius
    }
    if (B1.pos.x + B1.radius > x_ext) {
        B1.vel.x = -B1.vel.x
        B1.pos.x = x_ext - B1.radius
    }
    if (B1.pos.y - B1.radius < 0)  {
        B1.vel.y = -B1.vel.y
        B1.pos.y = B1.radius
    }
    if (B1.pos.y + B1.radius > y_ext) {
        B1.vel.y = -B1.vel.y
        B1.pos.y = y_ext - B1.radius
    }
  }

  // Erase and redraw
  const screen_pos = PostoScreen(B1.pos)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#8c00ff";
  ctx.beginPath();
  ctx.arc(screen_pos.x, screen_pos.y, ValuetoScreen(B1.radius), 0, 2 * Math.PI);
  ctx.fill();

requestAnimationFrame(frame); // ask for the next frame
}

requestAnimationFrame(frame)