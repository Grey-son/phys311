export function installKeyboardControls({

    onPause = () => {},
    onReset = () => {},
    onStep = () => {},
    onSpeedChange = () => {}

} = {}) {
    window.addEventListener("keydown", event => {
        const target = event.target;

        const editing = target instanceof HTMLElement &&
            (
                target.matches(
                    "input, select, textarea, button"
                ) ||
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
        if (event.key === ".") {
            event.preventDefault();
            onStep();
        }
        if (event.key === "+" || event.key === "=") {
            onSpeedChange(0.05);
        }
        if (event.key === "-" || event.key === "_") {
            onSpeedChange(-0.05);
        }
    });
}