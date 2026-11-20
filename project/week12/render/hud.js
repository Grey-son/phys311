export function drawHud(ctx, canvas, world, hud) {

  const drift = hud.E0 === 0
    ? 0 : (world.totalEnergy() - hud.E0) / hud.E0;

  const lines = [
    "t        = " + world.time.toFixed(6) + " s",
    "steps    = " + world.steps,
    "status   = " + (hud.paused ? "PAUSED" : "RUNNING"),
    "speed    = " + hud.speed.toFixed(2) + "x",
    "fps      = " + hud.fps.toFixed(0),
    "DT       = 1/" + hud.dtDenom + " s",
    "E        = " + world.totalEnergy().toFixed(3) + " J",
    "dE/E0    = " + (drift >= 0 ? "+" : "") + drift.toExponential(3),
  ];

  ctx.save();

  const lineHeight = 17;
  const panelWidth = 280;
  const panelHeight = lines.length * lineHeight + 14;

  ctx.font = "12px monospace";
  ctx.textBaseline = "top";

  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(8, 65, panelWidth, panelHeight);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = "#d4d4d4";

    if (i === 2) {
      ctx.fillStyle = hud.paused ? "#f48771" : "#4ec9b0";
    }

    if (i === 9) {
      ctx.fillStyle = Math.abs(drift) > 0.01 ? "#f48771" : "#4ec9b0";
    }

    ctx.fillText(lines[i], 18, 72 + i * lineHeight);
  }

  ctx.restore();
}