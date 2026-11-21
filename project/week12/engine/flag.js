import { Vec2 } from "./vec2.js";

export class Flag {
    constructor({ pos = new Vec2(), radius = 0.8 } = {}) {
        this.pos = pos.clone();
        this.radius = radius;
    }

    isTouchedBy(body) {
        const distance = body.pos.sub(this.pos).length();
        return distance <= body.radius + this.radius;
    }
}