import level01 from "./level01.js";

export const levels = [
    level01
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