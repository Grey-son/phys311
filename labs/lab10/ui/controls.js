export function createControls({
    onReset = () => {},
    onPause = () => {},
    onDimensionsChange = () => {}
} = {}) {
    const elements = {
        bodyCount: document.getElementById("bodyCount"),
        boxWidth: document.getElementById("boxWidth"),
        boxHeight: document.getElementById("boxHeight"),
        dt: document.getElementById("dt"),
        integrator: document.getElementById("integrators"),
        trail: document.getElementById("doTrail"),
        heading: document.getElementById("doHeading"),
        pause: document.getElementById("pause"),
        reset: document.getElementById("reset")
    };

    const outputs = {
        bodyCount: document.getElementById("bodyCountValue"),
        boxWidth: document.getElementById("boxWidthValue"),
        boxHeight: document.getElementById("boxHeightValue"),
        dt: document.getElementById("dtValue")
    };

    function getValues() {
        return {
            bodyCount: Number(elements.bodyCount.value),
            boxWidth: Number(elements.boxWidth.value),
            boxHeight: Number(elements.boxHeight.value),
            dtDenom: Number(elements.dt.value),
            integrator: elements.integrator.value,
            trail: elements.trail.checked,
            heading: elements.heading.checked
        };
    }

    function updateOutputs() {
        const values = getValues();

        outputs.bodyCount.textContent = values.bodyCount;
        outputs.boxWidth.textContent = `${values.boxWidth} m`;
        outputs.boxHeight.textContent = `${values.boxHeight} m`;
        outputs.dt.textContent = `1/${values.dtDenom} s`;
    }

    // Update slider labels as the user moves a slider.
    for (const input of [
        elements.bodyCount,
        elements.boxWidth,
        elements.boxHeight,
        elements.dt
    ]) {
        input.addEventListener("input", () => {
            updateOutputs();

            // Dimensions change live without rebuilding particles.
            if (input === elements.boxWidth ||
                input === elements.boxHeight) {
                onDimensionsChange(getValues());
            }
        });
    }

    // These settings require rebuilding the simulation.
    elements.bodyCount.addEventListener("change", onReset);
    elements.dt.addEventListener("change", onReset);
    elements.integrator.addEventListener("change", onReset);

    elements.trail.addEventListener("change", () => {
        onDimensionsChange(getValues());
    });

    elements.heading.addEventListener("change", () => {
        onDimensionsChange(getValues());
    });

    elements.pause.addEventListener("click", onPause);
    elements.reset.addEventListener("click", onReset);

    function setPaused(paused) {
        elements.pause.textContent = paused ? "Resume" : "Pause";
    }

    updateOutputs();

    return {
        getValues,
        setPaused
    };
}