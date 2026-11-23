// DEBUG HUD.
// Energy drift tolerance is +/-1.0% of initial total energy.

export function drawHud(ctx, canvas, world, hud) {

    // Completely hide detailed HUD outside debug mode.
    if (!hud.debug) return;

    const energy = world.totalEnergy();

    const driftPercent = hud.E0 === 0
        ? 0
        : 100 * (energy - hud.E0) / Math.abs(hud.E0);

    const driftOutOfTolerance = Math.abs(driftPercent) > 1.0;

    const momentum = world.absMomentum();

    const maxSpeed = world.bodies.reduce(
        (max, body) => Math.max(max, body.vel.length()), 0
    );

    const lines = [
        {
            text: `ENERGY   = ${energy.toFixed(5)} J`,
            color: "#d4d4d4"
        },
        {
            text: `DRIFT    = ${driftPercent >= 0 ? "+" : ""}${driftPercent.toFixed(3)}% (tol. 1.0%)`,
            color: driftOutOfTolerance ? "#ff4d4f" : "#4ec9b0"
        },
        {
            text: `|P|      = ${momentum.toFixed(5)}`,
            color: "#d4d4d4"
        },
        {
            text: `BODIES   = ${world.bodies.length}`,
            color: "#d4d4d4"
        },
        {
            text: `CONTACTS = ${hud.contactsThisStep}`,
            color: "#d4d4d4"
        },
        {
            text: `MAX SPEED= ${maxSpeed.toFixed(5)}`,
            color: "#d4d4d4"
        },
        {
            text: `FPS      = ${hud.fps.toFixed(1)}`,
            color: "#d4d4d4"
        },
        {
            text: `MODE     = ${hud.conservativeMode ? "CONSERVATIVE (e=1, uK=0)" : "NORMAL"}`,
            color: hud.conservativeMode ? "#4ec9b0" : "#d4d4d4"
        }
    ];

    ctx.save();

    const lineHeight = 18;
    const padding = 10;
    const panelWidth = 300;
    const panelHeight = 25 + lines.length * lineHeight + padding;

    const x = 10;
    const y = 55;

    ctx.font = "12px monospace";
    ctx.textBaseline = "top";

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(x, y, panelWidth, panelHeight);

    // Border
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.fillText("DEBUG / PHYSICS", x + padding, y + 6);

    // Diagnostic information
    ctx.font = "12px monospace";

    lines.forEach((line, i) => {
        ctx.fillStyle = line.color;
        ctx.fillText(
            line.text,
            x + padding,
            y + 27 + i * lineHeight
        );
    });

    ctx.restore();
}