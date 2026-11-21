const STORAGE_KEY = "gravity-slingshot-progress";

export function createScreenManager(levels) {

    const mainMenu = document.getElementById("main-menu");
    const levelSelect = document.getElementById("level-select");
    const gameView = document.getElementById("game-view");

    const levelGrid = document.getElementById("level-grid");

    const screens = [
        mainMenu,
        levelSelect,
        gameView
    ];

    // ------------------------------------------
    // Progress
    // ------------------------------------------

    function loadProgress() {

        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            );

            if (Array.isArray(saved)) {
                return new Set(saved);
            }
        } catch (error) {
            console.warn("Could not load progress:", error);
        }

        return new Set();
    }

    const unlocked = loadProgress();

    // Always unlock the first level.
    if (levels.length > 0) {
        unlocked.add(levels[0].id);
    }

    function saveProgress() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify([...unlocked])
            );
        } catch (error) {
            console.warn("Could not save progress:", error);
        }
    }

    // ------------------------------------------
    // Screen navigation
    // ------------------------------------------

    function show(screen) {

        for (const element of screens) {
            element.classList.remove("active");
        }

        screen.classList.add("active");
    }

    function showMainMenu() {
        show(mainMenu);
    }

    function showLevelSelect() {
        show(levelSelect);
    }

    function showGame() {
        show(gameView);
    }

    // ------------------------------------------
    // Level progression
    // ------------------------------------------

    function isUnlocked(levelId) {
        return unlocked.has(levelId);
    }

    function completeLevel(levelId) {

        const index = levels.findIndex(
            level => level.id === levelId
        );

        if (index >= 0 && index + 1 < levels.length) {
            unlocked.add(levels[index + 1].id);
        }

        saveProgress();
    }

    function firstUnlocked() {
        return levels.find(level => isUnlocked(level.id));
    }

    function nextLevel(levelId) {

        const index = levels.findIndex(
            level => level.id === levelId
        );

        if (index < 0) return null;

        return levels[index + 1] ?? null;
    }

    // ------------------------------------------
    // Level selection UI
    // ------------------------------------------

    function renderLevelSelect(onSelect) {

        levelGrid.replaceChildren();

        levels.forEach((level, index) => {

            const unlockedLevel = isUnlocked(level.id);

            const card = document.createElement("button");

            card.type = "button";
            card.className = "level-card";

            card.disabled = !unlockedLevel;

            const number = document.createElement("span");
            number.className = "level-number";
            number.textContent =
                String(index + 1).padStart(2, "0");

            const title = document.createElement("strong");
            title.textContent = level.name;

            const description = document.createElement("span");
            description.textContent = level.description;

            const par = document.createElement("span");
            par.className = "level-par";
            par.textContent = `PAR ${level.par}`;

            const status = document.createElement("span");
            status.className = "level-status";

            status.textContent = unlockedLevel
                ? "AVAILABLE"
                : "LOCKED";

            card.append(
                number,
                title,
                description,
                par,
                status
            );

            if (unlockedLevel) {
                card.addEventListener("click", () => {
                    onSelect(level);
                });
            }

            levelGrid.appendChild(card);
        });
    }

    return {
        showMainMenu,
        showLevelSelect,
        showGame,

        renderLevelSelect,

        completeLevel,
        firstUnlocked,
        nextLevel,
        isUnlocked
    };
}