import { Vec2 } from "./vec2.js";

export class Box {
    constructor(x_ext = [-5,5], y_ext = [-5,5], e=1) {
        this.x_ext = x_ext; this.y_ext = y_ext; this.e = e;
    }
    resolve(world) {
        for (const b of world.bodies) {
            if (b.pos.x - b.radius < this.x_ext[0]) {
                b.vel.x = -b.vel.x*this.e; b.pos.x = this.x_ext[0] + b.radius;
            } if (b.pos.x + b.radius > this.x_ext[1]) {
                b.vel.x = -b.vel.x*this.e; b.pos.x = this.x_ext[1] - b.radius;
            }
            if (b.pos.y - b.radius < this.y_ext[0]) {
                b.vel.y = -b.vel.y*this.e; b.pos.y = this.y_ext[0] + b.radius;
            } if (b.pos.y + b.radius > this.y_ext[1]) {
                b.vel.y = -b.vel.y*this.e; b.pos.y = this.y_ext[1] - b.radius;
            }
        }
    }
}

export class BodyCollisions {
    constructor(e=1) {this.e=e; this.count=0;}
    resolvePair(b1,b2) {
        const d = b2.pos.sub(b1.pos)
        const dist = d.length()
        if (dist === 0 || dist > b1.radius + b2.radius) {return false}

        const n = d.mul(1/dist)
        const v_rel = b2.vel.sub(b1.vel)
        const vn = v_rel.dot(n)

        if (vn>0) {return false}

        if (b1.invMass + b2.invMass === 0) {return false}

        const J = -(1+this.e)*vn/(b1.invMass+b2.invMass)
        b1.vel.addScaled(-J*b1.invMass,n)
        b2.vel.addScaled(J*b2.invMass,n)

        const overlap = b1.radius + b2.radius - dist
        b1.pos.addScaled(-overlap*b1.invMass/(b1.invMass+b2.invMass),n)
        b2.pos.addScaled(overlap*b2.invMass/(b1.invMass+b2.invMass),n)
        return true
    }
    resolve(world) {
        for (let i = 0; i < world.bodies.length; i++) {
            const b1 = world.bodies[i];
            for (let j = i+1; j < world.bodies.length; j++) {
                const b2 = world.bodies[j];
                if (this.resolvePair(b1,b2)) {this.count += 1;}
            }
        }
    }
}