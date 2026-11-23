export function bindKeyboard({isDragging, togglePaused, reset, toggleDebug, toggleConservative}) {
    function onKeyDown(event) {
        const target = event.target;
        const typing = target && (
            target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        );

        if (typing) return;

        if (event.code === "Space") {
            event.preventDefault();
            if (!isDragging()) togglePaused();

        } else if (event.key.toLowerCase() === "r") {
            reset();

        } else if (event.key.toLowerCase() === "d" && !event.repeat) {
            toggleDebug();

        } else if (event.key.toLowerCase() === "c" && !event.repeat) {
            toggleConservative();
        }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
}