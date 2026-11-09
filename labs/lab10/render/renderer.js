import { drawHud } from "./hud.js";

export function drawGrid(ctx, canvas, cam, spacing, label = 0) {
    ctx.save();
    ctx.strokeStyle = "#303030";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#999";
    ctx.font = "11px monospace";

    const x0 =
        Math.ceil(cam.toWorldX(0) / spacing) * spacing;
    const x1 = cam.toWorldX(canvas.width);

    for (let x = x0; x <= x1; x += spacing) {
        const px = cam.toScreenX(x);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();

        if (Math.abs(x) > 1e-9) {
            ctx.fillText(
                x.toFixed(label),
                px + 3,
                canvas.height - 5
            );
        }
    }

    const y0 =
        Math.ceil(cam.toWorldY(canvas.height) / spacing) * spacing;
    const y1 = cam.toWorldY(0);

    for (let y = y0; y <= y1; y += spacing) {
        const py = cam.toScreenY(y);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();

        if (Math.abs(y) > 1e-9) {
            ctx.fillText(
                y.toFixed(label),
                4,
                py - 4
            );
        }
    }

    // Coordinate axes.
    ctx.strokeStyle = "#626262";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cam.toScreenY(0));
    ctx.lineTo(canvas.width, cam.toScreenY(0));
    ctx.moveTo(cam.toScreenX(0), 0);
    ctx.lineTo(
        cam.toScreenX(0),
        canvas.height
    );
    ctx.stroke();
    ctx.restore();
}

function speedColor(body, maxSpeed = 15) {
    const speed = body.vel.length();
    const t = Math.max(
        0,
        Math.min(speed / maxSpeed, 1)
    );

    const r = Math.round(139 * t);
    const b = Math.round(139 * (1 - t));

    return `rgb(${r}, 0, ${b})`;
}

function drawArrow(
    ctx,
    x1,
    y1,
    x2,
    y2,
    color,
    lineWidth = 2
) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const headLength = 7;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

export function drawSpeedHistogram(ctx, canvas, world) {
    const BIN_COUNT = 20;
    const MAX_SPEED = 25;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, W, H);

    const bodies = world.bodies.filter(
        b => !b.fixed
    );

    const N = bodies.length;

    if (N === 0) return;

    const speeds = bodies.map(
        b => b.vel.length()
    );

    const meanSpeed =
        speeds.reduce((a, b) => a + b, 0) / N;

    const bins = new Array(BIN_COUNT).fill(0);
    const binWidth = MAX_SPEED / BIN_COUNT;

    for (const speed of speeds) {
        const index = Math.min(
            Math.floor(speed / binWidth),
            BIN_COUNT - 1
        );
        bins[index]++;
    }

    const left = 65;
    const right = W - 25;
    const top = 42;
    const bottom = H - 42;

    const plotW = right - left;
    const plotH = bottom - top;

    const maxCount = Math.max(
        1,
        Math.ceil(Math.max(...bins) * 1.1)
    );

    ctx.fillStyle = "#d4d4d4";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "left";

    ctx.fillText(
        "Particle Speed Distribution",
        left,
        23
    );

    ctx.font = "12px monospace";
    ctx.fillText(
        `N = ${N}    Mean speed = ${meanSpeed.toFixed(2)}`,
        W - 330,
        23
    );

    // Grid and vertical labels.
    ctx.font = "11px monospace";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
        const value = maxCount * i / 4;
        const y = bottom - (value / maxCount) * plotH;

        ctx.strokeStyle = "#393939";
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();

        ctx.fillStyle = "#aaa";
        ctx.fillText(
            value.toFixed(0),
            left - 8,
            y + 4
        );
    }

    // Histogram bars.
    const barW = plotW / BIN_COUNT;

    for (let i = 0; i < BIN_COUNT; i++) {
        const barH =
            (bins[i] / maxCount) * plotH;

        ctx.fillStyle = "#3988c9";
        ctx.fillRect(
            left + i * barW + 1,
            bottom - barH,
            Math.max(0, barW - 2),
            barH
        );
    }

    // Mean speed marker.
    const meanX = left +
        Math.min(meanSpeed / MAX_SPEED, 1) * plotW;

    ctx.strokeStyle = "#f48771";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(meanX, top);
    ctx.lineTo(meanX, bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // X-axis labels.
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "center";

    for (let i = 0; i <= 5; i++) {
        const speed = MAX_SPEED * i / 5;
        const x = left + (speed / MAX_SPEED) * plotW;

        ctx.fillText(
            speed.toFixed(1),
            x,
            bottom + 17
        );
    }

    ctx.fillStyle = "#d4d4d4";
    ctx.font = "12px monospace";

    ctx.fillText(
        "Speed (m/s)",
        left + plotW / 2,
        H - 5
    );

    ctx.save();

    ctx.translate(15, top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Particle count", 0, 0);
    ctx.restore();

    ctx.textAlign = "right";
    ctx.fillStyle = "#f48771";
    ctx.fillText(
        "Mean speed",
        right,
        top - 10
    );

    ctx.textAlign = "left";
}

function drawTrails(ctx, world, cam) {
    if (!world.meta.trail) return;

    for (const b of world.bodies) {
        if (b.trail.length < 2) continue;

        for (let i = 1; i < b.trail.length; i++) {
            const alpha = i / (b.trail.length - 1);

            ctx.globalAlpha = alpha;
            ctx.strokeStyle = speedColor(b);
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(
                cam.toScreenX(b.trail[i - 1].x),
                cam.toScreenY(b.trail[i - 1].y)
            );
            ctx.lineTo(
                cam.toScreenX(b.trail[i].x),
                cam.toScreenY(b.trail[i].y)
            );
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
}

function drawAimPreview(ctx, world, cam) {
    const aim = world.meta.aimPreview;
    if (!aim) return;

    const start = aim.start;
    const end = aim.end;
    const velocity = start.sub(end).mul(1.5);

    const PREVIEW_TIME = 2;
    const STEPS = 50;

    ctx.save();

    ctx.strokeStyle = "#f48771";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();

    for (let i = 0; i <= STEPS; i++) {
        const t = PREVIEW_TIME * i / STEPS;

        const x = start.x + velocity.x * t;
        const y = start.y + velocity.y * t;
        const sx = cam.toScreenX(x);
        const sy = cam.toScreenY(y);

        if (i === 0) {
            ctx.moveTo(sx, sy);
        } else {
            ctx.lineTo(sx, sy);
        }
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Launch position marker.
    ctx.fillStyle = "#f48771";
    ctx.beginPath();
    ctx.arc(
        cam.toScreenX(start.x),
        cam.toScreenY(start.y),
        5,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
}

function drawVectors(ctx, world, cam, body, x, y) {
    // Velocity vector.
    if (world.meta.velVec) {
        const scale = 0.25;
        const tipX = cam.toScreenX(body.pos.x + body.vel.x * scale);
        const tipY = cam.toScreenY(body.pos.y + body.vel.y * scale);
        drawArrow(ctx,x,y,tipX,tipY,"#9cdcfe");
    }

    // Net force vector.
    if (
        world.meta.forceVec &&
        body.lastForce
    ) {
        const forceScale = 0.04;
        const tipX = cam.toScreenX(body.pos.x + body.lastForce.x * forceScale);
        const tipY = cam.toScreenY(body.pos.y + body.lastForce.y * forceScale);

        drawArrow(ctx,x,y,tipX,tipY,"#f48771");
    }
}

function drawSpeedLegend(ctx) {
  ctx.save();

  ctx.font = "12px monospace";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#d4d4d4";
  ctx.fillText("Particle speed:",18,35);

  const gradient = ctx.createLinearGradient(125,0,255,0);
  gradient.addColorStop(0, "rgb(0, 0, 139)");
  gradient.addColorStop(1, "rgb(139, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(125,29,130,12);

  ctx.fillStyle = "#d4d4d4";
  ctx.fillText("Slow",125,53);

  ctx.textAlign = "right";
  ctx.fillText("Fast",255,53);
  ctx.restore();
}

function drawCrosshair(ctx, canvas, world, hud) {
  if (!hud.cursorWorld) return;

  const cam = world.meta.camera;
  const p = hud.cursorWorld;
  const x = cam.toScreenX(p.x);
  const y = cam.toScreenY(p.y);

  ctx.save();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function draw(ctx, canvas, world, hud) {
  const cam = world.meta.camera;

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Background grid.
  drawGrid(ctx,canvas,cam,world.meta.tickSpacing,0);

  // Simulation box.
  if (world.meta.kind === "box") {
    const { cx, cy, w, h } = world.meta;

    const left = cam.toScreenX(cx - w / 2);
    const right = cam.toScreenX(cx + w / 2);
    const top = cam.toScreenY(cy + h / 2);
    const bottom = cam.toScreenY(cy - h / 2);

    ctx.fillStyle = "#263f40";
    ctx.fillRect(left,top,right - left,bottom - top);
    ctx.strokeStyle = "#a66a37";
    ctx.lineWidth = 3;
    ctx.strokeRect(left,top,right - left,bottom - top);
  }


  // Trails.
  drawTrails(ctx, world, cam);


  // Slingshot preview.
  drawAimPreview(ctx, world, cam);


  // Particles and vectors.
  for (const b of world.bodies) {
    const x = cam.toScreenX(b.pos.x);
    const y = cam.toScreenY(b.pos.y);
    const radius = Math.max(3,cam.toScreenLen(b.radius));

    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI * 2);

    ctx.fillStyle = speedColor(b);
    ctx.fill();
    ctx.strokeStyle = "#d4d4d4";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    drawVectors(ctx, world,cam,b,x,y);
  }

  drawSpeedLegend(ctx);
  drawCrosshair(ctx,canvas,world,hud);
  drawHud(ctx, canvas, world, hud);
}