export function drawHud(ctx, canvas, world, hud) {

  const drift = hud.E0 === 0
    ? 0 : (world.totalEnergy() - hud.E0) / Math.abs(hud.E0);

  const lines = [
    {
      text: `STROKES   = ${hud.strokes} / ${hud.par}`,
      color: hud.strokes > hud.par ? "#f48771" : "#4ec9b0"
    },
    {
      text: `PAR      = ${hud.par}`,
      color: "#d4d4d4"
    },
    {
      text: `G        = ${hud.gravityG.toFixed(3)}`,
      color: "#d4d4d4"
    },
    {
      text: `|g|      = ${hud.gravityMagnitude.toFixed(5)}`,
      color: "#facc15"
    },
    {
      text: `DIRECTION= ${hud.gravityDirection}`,
      color: "#facc15"
    },
    {
      text: `ANGLE    = ${hud.gravityAngle.toFixed(2)} deg`,
      color: "#facc15"
    },
    {
      text: `t        = ${world.time.toFixed(3)} s`,
      color: "#d4d4d4"
    },
    {
      text: `steps    = ${world.steps}`,
      color: "#d4d4d4"
    },
    {
      text: `status   = ${hud.paused ? "PAUSED" : "RUNNING"}`,
      color: hud.paused ? "#f48771" : "#4ec9b0"
    },
    {
      text: `fps      = ${hud.fps.toFixed(0)}`,
      color: "#d4d4d4"
    },
    {
      text: `DT       = 1/${hud.dtDenom} s`,
      color: "#d4d4d4"
    },
    {
      text: `E        = ${world.totalEnergy().toFixed(3)} J`,
      color: "#d4d4d4"
    },
    {
      text: `dE/E0    = ${drift >= 0 ? "+" : ""}${drift.toExponential(3)}`,
      color: Math.abs(drift) > 0.01 ? "#f48771" : "#4ec9b0"
    }
  ];

  ctx.save();

  const lineHeight = 17;
  const padding = 10;
  const panelWidth = 270;
  const panelHeight = lines.length * lineHeight + padding * 2;

  const x = 10;
  const y = 55;

  ctx.font = "12px monospace";
  ctx.textBaseline = "top";

  // HUD background
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(x, y, panelWidth, panelHeight);

  // HUD border
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  // HUD title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px monospace";
  ctx.fillText("SIMULATION DATA", x + padding, y + 6);

  ctx.font = "12px monospace";

  // HUD information
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = lines[i].color;
    ctx.fillText(lines[i].text, x + padding, y + 25 + i * lineHeight);
  }

  ctx.restore();
}