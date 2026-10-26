import { Vec2 } from "./vec2.js"

export class Gravity {
    constructor(g=9.81) {this.g = g;}
    apply(world) {
        for (const b of world.bodies) {
            if (b.fixed) continue;
            b.force.y -= b.mass*this.g;
        }
    }
    potentialEnergy(world) {
        let U = 0;
        for (const b of world.bodies) if (!b.fixed) U += this.g*b.pos.y*b.mass;
        return U;
    }
    clone() {return new Gravity(this.g);}
}

export class Drag {
    constructor(c=9.81, quadratic=true) {this.c = c; this.quadratic = quadratic;}
    apply(world) {
        let speed = 0
        for (const b of world.bodies) {
            if (b.fixed) continue;
            speed = b.vel.length()
            if (this.quadratic) {b.force.addScaled(-this.c*speed, b.vel);}
            if (!this.quadratic) {b.force.addScaled(-this.c, b.vel);}
        }
    }
    potentialEnergy(world) {
        let U = 0;
        return U;
    }
    clone() {return new Drag(this.c, this.quadratic);}
}