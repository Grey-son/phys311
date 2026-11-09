export function installPointerControls(
    canvas,
    getWorld,
    onResize,
    limits = {
        minWidth: 10,
        maxWidth: 75,
        minHeight: 10,
        maxHeight: 50
    }
) {
    const HANDLE_SIZE = 12;

    let drag = null;

    function canvasPosition(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
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

        // Corners take priority over individual edges.
        if (nearLeft && nearTop) return "top-left";
        if (nearRight && nearTop) return "top-right";
        if (nearLeft && nearBottom) return "bottom-left";
        if (nearRight && nearBottom) return "bottom-right";

        if (nearLeft && pos.y >= bounds.top && pos.y <= bounds.bottom)
            return "left";

        if (nearRight && pos.y >= bounds.top && pos.y <= bounds.bottom)
            return "right";

        if (nearTop && pos.x >= bounds.left && pos.x <= bounds.right)
            return "top";

        if (nearBottom && pos.x >= bounds.left && pos.x <= bounds.right)
            return "bottom";

        return null;
    }

    function setCursor(handle) {
        const cursors = {
            "left": "ew-resize",
            "right": "ew-resize",
            "top": "ns-resize",
            "bottom": "ns-resize",
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

        const camera = world.meta.camera;

        const currentX = camera.toWorldX(pos.x);
        const currentY = camera.toWorldY(pos.y);

        const dx = currentX - drag.startX;
        const dy = currentY - drag.startY;

        let left = drag.left;
        let right = drag.right;
        let bottom = drag.bottom;
        let top = drag.top;

        // Move the selected boundaries.
        if (drag.handle.includes("left")) left += dx;
        if (drag.handle.includes("right")) right += dx;
        if (drag.handle.includes("bottom")) bottom += dy;
        if (drag.handle.includes("top")) top += dy;

        // Enforce dimensions while keeping the opposite edge fixed.
        let width = clamp(right - left, limits.minWidth, limits.maxWidth);
        let height = clamp(top - bottom, limits.minHeight, limits.maxHeight);

        // Snap to whole metres to match the sliders.
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

        if (canvas.hasPointerCapture(drag.pointerId)) {
            canvas.releasePointerCapture(drag.pointerId);
        }

        drag = null;
    }

    canvas.addEventListener("pointerup", stopDrag);
    canvas.addEventListener("pointercancel", stopDrag);
    canvas.addEventListener("lostpointercapture", () => {
        drag = null;
    });
}