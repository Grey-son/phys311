export function bindKeyboard({isDragging, togglePaused, reset}) {
    function onKeyDown(event) {
        if (event.code === "Space") {
            event.preventDefault();
            
            if (!isDragging()) {togglePaused();}

        } else if (event.key.toLowerCase() === "r") {reset();}
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {window.removeEventListener("keydown", onKeyDown);};
}