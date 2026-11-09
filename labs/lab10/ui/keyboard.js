export function installKeyboardControls({
    onPause = () => {},
    onReset = () => {}
} = {}) {
    window.addEventListener("keydown", (event) => {
        const target = event.target;

        // Do not intercept keys while using form controls.
        const editing = target instanceof HTMLElement &&
            (
                target.matches("input, select, textarea, button") ||
                target.isContentEditable
            );

        if (editing) return;

        if (event.code === "Space") {
            event.preventDefault();
            onPause();
        }

        if (event.key.toLowerCase() === "r") {
            onReset();
        }
    });
}