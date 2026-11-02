import { drawHud } from "./hud.js";

export function drawGrid(ctx, canvas, cam, spacing, label) {
  ctx.strokeStyle = "#2f2f2f"; ctx.lineWidth = 1;
  ctx.fillStyle = "#888"; ctx.font = "11px monospace";

  const x0 = Math.ceil(cam.toWorldX(0) / spacing) * spacing;
  const x1 = cam.toWorldX(canvas.width);
  for (let x = x0; x <= x1; x += spacing) {
    const px = cam.toScreenX(x);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height); ctx.stroke();
    if (Math.abs(x) > 1e-9) ctx.fillText(x.toFixed(label), px + 3, canvas.height - 5);
  }
  const y0 = Math.ceil(cam.toWorldY(canvas.height) / spacing) * spacing;
  const y1 = cam.toWorldY(0);
  for (let y = y0; y <= y1; y += spacing) {
    const py = cam.toScreenY(y);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(canvas.width, py); ctx.stroke();
    if (Math.abs(y) > 1e-9) ctx.fillText(y.toFixed(label), 4, py - 4);
  }
  // axes
  ctx.strokeStyle = "#5a5a5a"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, cam.toScreenY(0)); ctx.lineTo(canvas.width, cam.toScreenY(0));
  ctx.moveTo(cam.toScreenX(0), 0); ctx.lineTo(cam.toScreenX(0), canvas.height);
  ctx.stroke();
}

export function drawScaleBar(ctx, canvas, cam, metres, text) {
  const px = cam.toScreenLen(metres);
  const x = canvas.width - px - 24, y = 30;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + px, y);
  ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
  ctx.moveTo(x + px, y - 5); ctx.lineTo(x + px, y + 5);
  ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(text, x + px / 2, y - 10);
  ctx.textAlign = "left";
}

export function draw(ctx, canvas, world, hud) {
  const cam = world.meta.camera;
  const spacing = world.meta.tickSpacing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (world.meta.kind === "projectile") {
    drawGrid(ctx, canvas, cam, spacing, 0);
    drawScaleBar(ctx, canvas, cam, 5, "5 m");
    // ground line
    ctx.strokeStyle = "#28a745"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, cam.toScreenY(0)); ctx.lineTo(canvas.width, cam.toScreenY(0));
    ctx.stroke();
  }
  if (world.meta.kind === "orbits") {
    drawGrid(ctx, canvas, cam, spacing, 0);
    drawScaleBar(ctx, canvas, cam, 5, "5 m");
  }
  if (world.meta.kind === "billiards") {
    // pool table
    const t_w = 50; const t_h = 25; const pad = 3;
    const p_rad = 1.5; const lowx = 5; const lowy = 3
    ctx.strokeStyle = "#362110"; ctx.lineWidth = 3;
    ctx.fillStyle = "#362110"
    ctx.beginPath();
    ctx.moveTo(cam.toScreenX(lowx-pad), cam.toScreenY(lowy-pad)); 
    ctx.lineTo(cam.toScreenX(lowx+t_w+pad), cam.toScreenY(lowy-pad)); 
    ctx.lineTo(cam.toScreenX(lowx+t_w+pad), cam.toScreenY(lowy+t_h+pad));
    ctx.lineTo(cam.toScreenX(lowx-pad), cam.toScreenY(lowy+t_h+pad));
    ctx.lineTo(cam.toScreenX(lowx-pad), cam.toScreenY(lowy-pad));
    ctx.stroke();
    ctx.fill();
    ctx.strokeStyle = "#244d2e"; ctx.lineWidth = 3;
    ctx.fillStyle = "#244d2e"
    ctx.beginPath();
    ctx.moveTo(cam.toScreenX(lowx), cam.toScreenY(lowy)); 
    ctx.lineTo(cam.toScreenX(lowx+t_w), cam.toScreenY(lowy)); 
    ctx.lineTo(cam.toScreenX(lowx+t_w), cam.toScreenY(lowy+t_h));
    ctx.lineTo(cam.toScreenX(lowx), cam.toScreenY(lowy+t_h));
    ctx.lineTo(cam.toScreenX(lowx), cam.toScreenY(lowy));
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = "#000"
    ctx.beginPath();
    ctx.arc(cam.toScreenX(lowx), cam.toScreenY(lowy),
            cam.toScreenLen(p_rad), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cam.toScreenX(lowx), cam.toScreenY(lowy+t_h),
            cam.toScreenLen(p_rad), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cam.toScreenX(lowx+t_w/2), cam.toScreenY(lowy+t_h),
            cam.toScreenLen(p_rad), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cam.toScreenX(lowx+t_w), cam.toScreenY(lowy+t_h),
            cam.toScreenLen(p_rad), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cam.toScreenX(lowx+t_w), cam.toScreenY(lowy),
            cam.toScreenLen(p_rad), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cam.toScreenX(lowx+t_w/2), cam.toScreenY(lowy),
            cam.toScreenLen(p_rad), 0, Math.PI * 2);
    ctx.fill();
  }
  if (world.meta.kind === "box") {
    const t_w = 50; const t_h = 25; const pad = 3;
    const lowx = 5; const lowy = 3
    ctx.fill();
    ctx.strokeStyle = "#6c3813"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cam.toScreenX(lowx), cam.toScreenY(lowy)); 
    ctx.lineTo(cam.toScreenX(lowx+t_w), cam.toScreenY(lowy)); 
    ctx.lineTo(cam.toScreenX(lowx+t_w), cam.toScreenY(lowy+t_h));
    ctx.lineTo(cam.toScreenX(lowx), cam.toScreenY(lowy+t_h));
    ctx.lineTo(cam.toScreenX(lowx), cam.toScreenY(lowy));
    ctx.stroke();
  }
  if (world.meta.kind === "unique") {
    drawGrid(ctx, canvas, cam, spacing, 0);
    drawScaleBar(ctx, canvas, cam, 5, "5 m");
  }

  if (world.meta.trail) {
    for (const b of world.bodies) {
      // trail
      if (b.trail.length > 1) {
        ctx.strokeStyle = b.color; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cam.toScreenX(b.trail[0].x), cam.toScreenY(b.trail[0].y));
        for (let i = 1; i < b.trail.length; i++)
          ctx.lineTo(cam.toScreenX(b.trail[i].x), cam.toScreenY(b.trail[i].y));
        ctx.stroke();
      }
    }
  }

  for (const b of world.bodies) {
    // body
    ctx.beginPath();
    ctx.arc(cam.toScreenX(b.pos.x), cam.toScreenY(b.pos.y),
            Math.max(4, cam.toScreenLen(b.radius)), 0, Math.PI * 2);
    ctx.fillStyle = b.color; ctx.fill();
    // velocity vector
    if (world.meta.velVec) {
      const vs = world.meta.kind === "spring" ? 0.6 : 0.25;
      const tipX = cam.toScreenX(b.pos.x + b.vel.x * vs);
      const tipY = cam.toScreenY(b.pos.y + b.vel.y * vs);
      ctx.strokeStyle = "#9cdcfe"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cam.toScreenX(b.pos.x), cam.toScreenY(b.pos.y));
      ctx.lineTo(tipX, tipY); ctx.stroke();
    }
  }
  
  // HUD
  drawHud(ctx, canvas, world, hud)
}