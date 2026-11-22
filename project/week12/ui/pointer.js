import { eventToWorld } from "./controls.js";

export function bindPointer({
    canvas,
    getCamera,
    getProjectile,
    getSling,

    isDragging,
    isWon = () => false,
    setDragging,
    setPaused,
    setPullVector,
    getPullVector,

    onChange
}) {

    let pointerWorld = null;
    let pointerStart = null;

    function onPointerDown(event) {

        // Only accept the primary pointer.
        if (
            !event.isPrimary ||
            event.button !== 0 ||
            isDragging() ||
            isWon()
        ) return;

        // Do not start a shot from an interactive control.
        if (event.target.closest("button, input, select, textarea, a")) {
            return;
        }

        const point = eventToWorld(
            event,
            canvas,
            getCamera()
        );

        pointerStart = point.clone();
        pointerWorld = point.clone();

        setDragging(true);
        setPaused(false);

        const projectile = getProjectile();

        projectile.fixed = true;
        projectile.invMass = 0;

        getSling().begin(projectile);

        setPullVector(getPullVector().zero());

        canvas.setPointerCapture(event.pointerId);

        event.preventDefault();

        onChange(point, pointerStart);
    }

    function onPointerMove(event) {

        if (!isDragging()) return;

        pointerWorld = eventToWorld(
            event,
            canvas,
            getCamera()
        );

        // Drag displacement becomes the slingshot pull vector.
        // The launch impulse points in the opposite direction.
        const pull = pointerWorld.sub(pointerStart);

        setPullVector(pull);

        getSling().setPull(pull);

        event.preventDefault();

        onChange(pointerWorld, pointerStart);
    }

    function releasePointer(event) {

        if (!isDragging()) return;

        // Capture the final pointer position in case the last
        // pointermove event was not delivered.
        if (event && event.clientX !== undefined) {
            pointerWorld = eventToWorld(
                event,
                canvas,
                getCamera()
            );

            const pull = pointerWorld.sub(pointerStart);

            setPullVector(pull);
            getSling().setPull(pull);
        }

        setDragging(false);

        const projectile = getProjectile();

        projectile.fixed = false;
        projectile.invMass = 1 / projectile.mass;

        getSling().release();

        const initialTouch = pointerStart;
        pointerStart = null;
        onChange(pointerWorld, initialTouch);
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    return () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", releasePointer);
        canvas.removeEventListener("pointercancel", releasePointer);
    };
}