import { Vec2 } from "../engine/vec2.js";
import { Body } from "../engine/body.js";
import { MouseSpring } from "../engine/forces.js";

export function installPointerControls(
    canvas,
    getWorld,
    onResize,
    limits = {minWidth: 10, maxWidth: 75, minHeight: 10, maxHeight: 50}
) {
    const HANDLE_SIZE = 12;
    let drag = null;

    function canvasPosition(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left)*canvas.width / rect.width,
            y: (event.clientY - rect.top)*canvas.height / rect.height
        };
    }

    function getBounds(world) {
        const { cx, cy, w, h, camera } = world.meta;
        return {
            left: camera.toScreenX(cx - w / 2),
            right: camera.toScreenX(cx + w / 2),
            top: camera.toScreenY(cy + h / 2),
            bottom: camera.toScreenY(cy - h / 2)
        };
    }

    function getHandle(pos, bounds) {
        const nearLeft = Math.abs(pos.x - bounds.left) <= HANDLE_SIZE;
        const nearRight = Math.abs(pos.x - bounds.right) <= HANDLE_SIZE;
        const nearTop = Math.abs(pos.y - bounds.top) <= HANDLE_SIZE;
        const nearBottom = Math.abs(pos.y - bounds.bottom) <= HANDLE_SIZE;

        if (nearLeft && nearTop) return "top-left";
        if (nearRight && nearTop) return "top-right";
        if (nearLeft && nearBottom) return "bottom-left";
        if (nearRight && nearBottom) return "bottom-right";

        if (nearLeft && pos.y >= bounds.top && pos.y <= bounds.bottom) return "left";
        if (nearRight && pos.y >= bounds.top && pos.y <= bounds.bottom) return "right";
        if (nearTop && pos.x >= bounds.left && pos.x <= bounds.right) return "top";
        if (nearBottom && pos.x >= bounds.left && pos.x <= bounds.right) return "bottom";

        return null;
    }


    function setCursor(handle) {

        const cursors = {

            left: "ew-resize",
            right: "ew-resize",

            top: "ns-resize",
            bottom: "ns-resize",

            "top-left": "nwse-resize",
            "bottom-right": "nwse-resize",

            "top-right": "nesw-resize",
            "bottom-left": "nesw-resize"

        };

        canvas.style.cursor = handle
            ? cursors[handle]
            : "default";

    }


    function clamp(value, min, max) {

        return Math.max(min, Math.min(max, value));

    }


    function snap(value) {

        return Math.round(value);

    }


    canvas.addEventListener("pointerdown", event => {

        const world = getWorld();

        if (!world || world.meta.kind !== "box") return;

        const pos = canvasPosition(event);

        const bounds = getBounds(world);

        const handle = getHandle(pos, bounds);

        if (!handle) return;

        const { cx, cy, w, h, camera } = world.meta;

        drag = {

            pointerId: event.pointerId,

            handle,

            startX: camera.toWorldX(pos.x),

            startY: camera.toWorldY(pos.y),

            left: cx - w / 2,

            right: cx + w / 2,

            bottom: cy - h / 2,

            top: cy + h / 2

        };

        canvas.setPointerCapture(event.pointerId);

        event.preventDefault();

    });


    canvas.addEventListener("pointermove", event => {

        const world = getWorld();

        if (!world || world.meta.kind !== "box") return;

        const pos = canvasPosition(event);

        if (!drag) {

            setCursor(getHandle(pos, getBounds(world)));

            return;

        }

        if (event.pointerId !== drag.pointerId) return;

        const camera = world.meta.camera;

        const currentX = camera.toWorldX(pos.x);

        const currentY = camera.toWorldY(pos.y);

        const dx = currentX - drag.startX;

        const dy = currentY - drag.startY;


        let left = drag.left;

        let right = drag.right;

        let bottom = drag.bottom;

        let top = drag.top;


        if (drag.handle.includes("left")) left += dx;

        if (drag.handle.includes("right")) right += dx;

        if (drag.handle.includes("bottom")) bottom += dy;

        if (drag.handle.includes("top")) top += dy;


        let width = clamp(
            right - left,
            limits.minWidth,
            limits.maxWidth
        );

        let height = clamp(
            top - bottom,
            limits.minHeight,
            limits.maxHeight
        );

        width = snap(width);
        height = snap(height);

        if (drag.handle.includes("left")) {
            left = right - width;
        } else {
            right = left + width;
        }

        if (drag.handle.includes("bottom")) {
            bottom = top - height;
        } else {
            top = bottom + height;
        }

        onResize({
            cx: (left + right) / 2,
            cy: (bottom + top) / 2,
            w: width,
            h: height
        });
    });

    function stopDrag(event) {
        if (!drag) return;
        if (event.pointerId !== drag.pointerId) return;
        const pointerId = drag.pointerId;
        drag = null;
        if (canvas.hasPointerCapture(pointerId)) {
            canvas.releasePointerCapture(pointerId);
        }
    }

    canvas.addEventListener("pointerup", stopDrag);
    canvas.addEventListener("pointercancel", stopDrag);
    canvas.addEventListener("lostpointercapture", () => {
        drag = null;
    });
}

export function installBodyInteraction(canvas, getWorld) {

    let interaction = null;

    function canvasToWorld(event) {
        const world = getWorld();
        const rect = canvas.getBoundingClientRect();

        const px = (event.clientX - rect.left) * canvas.width / rect.width;
        const py = (event.clientY - rect.top) * canvas.height / rect.height;

        return new Vec2(
            world.meta.camera.toWorldX(px),
            world.meta.camera.toWorldY(py)
        );
    }

    function findBody(world, point) {
        let closest = null;
        let minDistance = Infinity;

        for (const b of world.bodies) {
            if (b.fixed) continue;

            const distance = b.pos.sub(point).length();

            if (distance <= b.radius && distance < minDistance) {
                closest = b;
                minDistance = distance;
            }
        }
        return closest;
    }

    canvas.addEventListener("pointerdown", event => {
        if (event.defaultPrevented) return;

        if (interaction) return;

        const world = getWorld();
        if (!world) return;

        const point = canvasToWorld(event);
        const body = findBody(world, point);

        canvas.setPointerCapture(event.pointerId);

        if (body) {
            const spring = new MouseSpring(body, point, 80, 16);
            world.addForce(spring);
            interaction = {type: "grab", pointerId: event.pointerId, spring};
        } else {
            interaction = {type: "slingshot", pointerId: event.pointerId, start: point.clone(), 
                end: point.clone()};
            world.meta.aimPreview = interaction;
        }
        event.preventDefault();
    });

    canvas.addEventListener("pointermove", event => {
        if (!interaction) return;
        if (event.pointerId !== interaction.pointerId) return;

        const world = getWorld();
        const point = canvasToWorld(event);

        if (interaction.type === "grab") {
            interaction.spring.target = point;
        } else {
            interaction.end = point;
            world.meta.aimPreview = interaction;
        }
    });

    function releaseInteraction(event) {
        if (!interaction) return;
        if (event.pointerId !== interaction.pointerId) return;
        const world = getWorld();
        const pointerId = interaction.pointerId;

        if (interaction.type === "grab") {
            world.forces = world.forces.filter(
                f => f !== interaction.spring
            );
        } else {
            const start = interaction.start;
            const end = interaction.end;
            const launchVelocity = start.sub(end).mul(1.5);
            const speed = launchVelocity.length();

            if (speed > 0.1) {
                const newBody = new Body({
                    mass: 1,
                    pos: start,
                    vel: launchVelocity,
                    radius: 0.6
                });
                world.add(newBody);
            }
            world.meta.aimPreview = null;
        }

        interaction = null;

        if (canvas.hasPointerCapture(pointerId)) {
            canvas.releasePointerCapture(pointerId);
        }
    }

    canvas.addEventListener("pointerup", releaseInteraction);
    canvas.addEventListener("pointercancel", releaseInteraction);
    canvas.addEventListener("lostpointercapture", () => {
        if (!interaction) return;
        const world = getWorld();
        if (interaction.type === "grab") {
            world.forces = world.forces.filter(
                f => f !== interaction.spring
            );
        }
        world.meta.aimPreview = null;
        interaction = null;
    });
}