import { Vec2 } from "../engine/vec2.js";

export function getControls() {
    const canvas = document.getElementById("sim");

    return {canvas, ctx: canvas.getContext("2d"), readout: document.getElementById("readout")};
}

export function eventToWorld(event, canvas, camera) {
    const rect = canvas.getBoundingClientRect();

    const px = (event.clientX - rect.left) * canvas.width / rect.width;

    const py = (event.clientY - rect.top) * canvas.height / rect.height;

    return new Vec2(camera.toWorldX(px), camera.toWorldY(py));
}

export function updateReadout(readout, {
    paused,
    dragging,
    projectile,
    pullVector,
    strokes = 0,
    won = false,
    conservativeMode = false
}) {
    const state = paused ? "paused" : "running";
    const modeLabel = conservativeMode ? "ON (e=1, uK=0)" : "OFF";
    const speed = projectile.vel.length();

    readout.textContent =
        `Space: ${state}  |  R: reset  |  C: conservative ${modeLabel}  ` +
        `Projectile speed: ${speed.toFixed(2)}  |  Strokes: ${strokes}  |  ` +
        (
            dragging
                ? `Pull: ${pullVector.length().toFixed(2)}`
                : (won ? "Flag reached! Press R or Play again": 
                    "Drag the small body to aim, release to launch"
                )
        );
}