export default {
    id: "level02",
    name: "Second Orbit",
    description: "Navigate the gravitational field and reach the portal.",

    par: 5,

    world: {
        width: 42,
        height: 26
    },

    physics: {
        G: 0.8,
        softening: 0.35,
        restitution: 0.8,
        collisionEps: 0.4
    },

    slingshot: {
        strength: 18,
        maxPull: 8,
        duration: 0.18,
        maxImpulse: 10
    },

    ghostDuration: 3.0,

    bodies: [
        {
            mass: 800,
            pos: [-20, 10],
            radius: 3.4,
            color: "#d9a441",
            fixed: true,
            uK: 1
        },
        {
            mass: 600,
            pos: [-15, -1],
            radius: 4.0,
            color: "#6ca6d9",
            fixed: true,
            uK: 1
        },
        {
            mass: 250,
            pos: [-6, 9],
            radius: 2.4,
            color: "#d9a441",
            fixed: true,
            uK: 1
        },
        {
            mass: 800,
            pos: [15, -5],
            radius: 4.3,
            color: "#6ca6d9",
            fixed: true,
            uK: 1
        },
        {
            mass: 3000,
            pos: [0, 0],
            radius: 4.0,
            color: "#545141",
            fixed: true,
            uK: 1
        }
    ],

    projectile: {
        mass: 1,
        pos: [-14, 12],
        vel: [-10, 0],
        radius: 0.25,
        color: "#f48771"
    },

    flag: {
        pos: [15, -10],
        radius: 0.85
    }
};