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

    function onPointerDown(event) {

        if (event.button !== 0 || isDragging() || isWon()) return;

        const projectile = getProjectile();

        const point = eventToWorld(
            event,
            canvas,
            getCamera()
        );

        if (
            projectile.pos.sub(point).length() >
            projectile.radius + 0.35
        ) return;

        setDragging(true);
        setPaused(false);

        projectile.fixed = true;
        projectile.invMass = 0;

        getSling().begin(projectile);

        setPullVector(getPullVector().zero());

        canvas.setPointerCapture(event.pointerId);

        event.preventDefault();

        onChange(point);
    }

    function onPointerMove(event) {

        pointerWorld = eventToWorld(
            event,
            canvas,
            getCamera()
        );

        if (!isDragging()) return;

        const pull = pointerWorld.sub(
            getProjectile().pos
        );

        setPullVector(pull);

        getSling().setPull(pull);

        onChange(pointerWorld);
    }

    function releasePointer() {

        if (!isDragging()) return;

        setDragging(false);

        const projectile = getProjectile();

        projectile.fixed = false;
        projectile.invMass = 1 / projectile.mass;

        getSling().release();

        onChange(pointerWorld);
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