import level01 from "./level01.js";
import level02 from "./level02.js";
import level03 from "./level03.js";
import level04 from "./level04.js";
import level05 from "./level05.js";

export const levels = [
    level01,
    level02,
    level03,
    level04,
    level05
];

export function getLevel(id) {
    return levels.find(level => level.id === id) ?? null;
}

export function getNextLevel(id) {
    const index = levels.findIndex(level => level.id === id);

    if (index < 0 || index + 1 >= levels.length) {
        return null;
    }

    return levels[index + 1];
}