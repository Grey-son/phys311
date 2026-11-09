export function createControls({

    onReset = () => {},
    onPause = () => {},
    onStep = () => {},
    onDimensionsChange = () => {}

} = {}) {

    const elements = {
        bodyCount: document.getElementById("bodyCount"),
        boxWidth: document.getElementById("boxWidth"),
        boxHeight: document.getElementById("boxHeight"),
        dt: document.getElementById("dt"),
        speed: document.getElementById("speed"),
        wallRestitution:document.getElementById("wallRestitution"),
        collisionRestitution:document.getElementById("collisionRestitution"),
        dragCoefficient:document.getElementById("dragCoefficient"),
        integrator: document.getElementById("integrators"),
        trail: document.getElementById("doTrail"),
        heading: document.getElementById("doHeading"),
        force: document.getElementById("doForce"),
        pause: document.getElementById("pause"),
        step: document.getElementById("step"),
        reset: document.getElementById("reset")
    };

    const outputs = {
        bodyCount: document.getElementById("bodyCountValue"),
        boxWidth: document.getElementById("boxWidthValue"),
        boxHeight: document.getElementById("boxHeightValue"),
        dt: document.getElementById("dtValue"),
        speed: document.getElementById("speedValue"),
        wallRestitution:document.getElementById("wallRestitutionValue"),
        collisionRestitution:document.getElementById("collisionRestitutionValue"),
        dragCoefficient:document.getElementById("dragCoefficientValue")
    };

    function getValues() {
        return {
            bodyCount: parseFloat(elements.bodyCount.value),
            boxWidth: parseFloat(elements.boxWidth.value),
            boxHeight: parseFloat(elements.boxHeight.value),
            dtDenom: parseFloat(elements.dt.value),
            speed: parseFloat(elements.speed.value),
            wallRestitution: parseFloat(elements.wallRestitution.value),
            collisionRestitution: parseFloat(elements.collisionRestitution.value),
            dragCoefficient: parseFloat(elements.dragCoefficient.value),
            integrator: elements.integrator.value,
            trail: elements.trail.checked,
            heading: elements.heading.checked,
            force: elements.force.checked
        };
    }

    function updateOutputs() {
        const values = getValues();
        outputs.bodyCount.textContent = values.bodyCount;
        outputs.boxWidth.textContent = `${values.boxWidth} m`;
        outputs.boxHeight.textContent = `${values.boxHeight} m`;
        outputs.dt.textContent = `1/${values.dtDenom} s`;
        outputs.speed.textContent = `${values.speed.toFixed(2)}x`;
        outputs.wallRestitution.textContent = values.wallRestitution.toFixed(2);
        outputs.collisionRestitution.textContent = values.collisionRestitution.toFixed(2);
        outputs.dragCoefficient.textContent = values.dragCoefficient.toFixed(3);
    }

    const liveSliders = [
        elements.boxWidth,
        elements.boxHeight,
        elements.speed,
        elements.wallRestitution,
        elements.collisionRestitution,
        elements.dragCoefficient
    ];

    const resetSliders = [elements.bodyCount, elements.dt];

    for (const input of [
        ...liveSliders,
        ...resetSliders
    ]) {
        input.addEventListener("input", () => {
            updateOutputs();
            if (liveSliders.includes(input)) {onDimensionsChange(getValues());}
        });
    }

    for (const input of resetSliders) {input.addEventListener("change", onReset);}

    elements.integrator.addEventListener("change", onReset);

    for (const input of [
        elements.trail,
        elements.heading,
        elements.force
    ]) {
        input.addEventListener("change", () => {onDimensionsChange(getValues());});
    }

    elements.pause.addEventListener("click", onPause);
    elements.step.addEventListener("click", onStep);
    elements.reset.addEventListener("click", onReset);

    function setPaused(paused) {
        elements.pause.textContent = paused ? "Resume" : "Pause";
        elements.step.disabled = !paused;
    }

    updateOutputs();

    return {getValues, setPaused, updateOutputs};
}