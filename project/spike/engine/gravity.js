import { Vec2 } from "./vec2.js";

export class NewtonianGravity {
    constructor(G = 1, eps = 0) {
        this.G = G;
        this.eps = eps;
    }

    apply(world) {
        for (let i = 0; i < world.bodies.length; i++) {
            const b1 = world.bodies[i];
            for (let j = i + 1; j < world.bodies.length; j++) {
                const b2 = world.bodies[j];
                const d = b2.pos.sub(b1.pos);
                const dist = d.length();
                if (dist === 0) continue;
                b1.force.addScaled(b1.mass*b2.mass*this.G/(dist**3+this.eps**2),d);
                b2.force.addScaled(-b1.mass*b2.mass*this.G/(dist**3+this.eps**2),d);
            }
        }
    }

    potentialEnergy(world) {
        let U = 0;
        for (let i = 0; i < world.bodies.length; i++) {
            const b1 = world.bodies[i];
            for (let j = i + 1; j < world.bodies.length; j++) {
                const b2 = world.bodies[j];
                const d = b2.pos.sub(b1.pos);
                const dist = d.length();
                if (dist > 0) {
                    U -= b1.mass*b2.mass*this.G/Math.sqrt(dist ** 2 + this.eps ** 2);
                }
            }
        }
        return U;
    }
}

export class SlingshotForce {
    constructor({ strength = 18, maxPull = 8, duration = 0.18 } = {}) {
        this.strength = strength;
        this.maxPull = maxPull;
        this.duration = duration;

        this.body = null;
        this.pull = new Vec2();

        this.active = false;
        this.released = false;
        this.releaseTime = 0;
    }

    begin(body) {
        this.body = body;
        this.pull.zero();

        this.active = true;
        this.released = false;
    }

    setPull(pull) {
        if (!this.active || this.released) return;

        this.pull = pull.clone();
    }

    release(time) {
        if (!this.active || this.released) return;

        this.released = true;
        this.releaseTime = time;
    }

    apply(world) {
        if (!this.active || !this.released) return;

        const elapsed = world.time - this.releaseTime;

        if (elapsed > this.duration) {
            this.active = false;
            return;
        }

        if (!this.body || this.body.fixed) return;

        const distance = Math.min(
            this.pull.length(),
            this.maxPull
        );

        if (distance === 0) {
            this.active = false;
            return;
        }

        const direction = this.pull.normalized().mul(-1);
        const decay = 1 - elapsed / this.duration;
        const magnitude = this.strength * distance * decay;
        this.body.force.addScaled(magnitude, direction);
    }
}