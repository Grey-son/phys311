export function drawHud(ctx, canvas, world, hud) {
  const drift = hud.E0 === 0 ? 0 : (world.totalEnergy() - hud.E0) / hud.E0;
  if (world.meta.kind === "box") {
    const lines = [
      "t      = " + world.time.toFixed(4) + " s",
      "steps  = " + world.steps,
      "fps    = " + hud.fps.toFixed(0) + "   (steps/frame " + hud.lastSteps + ")",
      "DT     = 1/" + hud.dtDenom + " s",
      "E      = " + world.totalEnergy().toFixed(3) + " J",
      "dE/E0  = " + (drift >= 0 ? "+" : "") + drift.toExponential(3),
      "N      = " + hud.N,
      "A      = " + (hud.A ?? 0).toFixed(1),
      "T      = " + (hud.temperature ?? 0).toFixed(1),
      "v_mean = " + (hud.meanSpeed ?? 0).toFixed(1),
      "P      = " + (hud.pressure ?? 0).toFixed(1),
      "PA/NT= " + (hud.gasRatio ?? 0).toFixed(1)
    ];
    ctx.font = "13px monospace"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(8, 8, 250, lines.length * 18 + 14);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = (i === lines.length - 2)
        ? (Math.abs(drift) > 0.01 ? "#f48771" : "#4ec9b0") : "#d4d4d4";
      ctx.fillText(lines[i], 18, 16 + i * 18);
    }
    ctx.textBaseline = "alphabetic";
  }
}