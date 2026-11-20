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

// Slingshot impulse interaction.
export class SlingshotForce {
    constructor({
        strength = 18,
        maxPull = 8,
        duration = 0.18
    } = {}) {

        this.strength = strength;
        this.maxPull = maxPull;
        this.duration = duration;

        this.body = null;
        this.pull = new Vec2();
        this.active = false;
    }

    begin(body) {
        this.body = body;
        this.pull.zero();
        this.active = true;
    }

    setPull(pull) {
        if (this.active) {
            this.pull = pull.clone();
        }
    }

    // Returns the impulse corresponding to the current pull.
    impulseForPull(pull) {
        const distance = Math.min(
            pull.length(),
            this.maxPull
        );

        if (distance === 0) return new Vec2();

        const direction = pull.normalized().mul(-1);

        // Integral of the former linearly decaying force:
        // J = strength * distance * duration / 2

        const impulseMagnitude =
            this.strength * distance * this.duration / 2;

        return direction.mul(impulseMagnitude);
    }

    // Apply impulse: delta-v = J / m.
    applyImpulse(body, pull = this.pull) {
        if (!body || body.fixed || body.invMass === 0) {
            return new Vec2();
        }

        const impulse = this.impulseForPull(pull);

        body.vel.addScaled(body.invMass, impulse);

        return impulse;
    }

    release() {
        if (!this.active) return new Vec2();

        const impulse = this.applyImpulse(
            this.body,
            this.pull
        );

        this.active = false;

        return impulse;
    }

    // No continuous force is applied during world integration.
    apply() {}
}

export class SlidingFriction {
    constructor() {
    }

    apply(world) {
        for (let i = 0; i < world.bodies.length; i++) {
            const b1 = world.bodies[i];
            if (b1.uS <= 0 || b1.touching.length === 0) {continue}
            for (let j = i + 1; j < b1.touching.length; j++) {
                const b2 = b1.touching[j];
                if (b2.fixed) {continue}
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
        return U;
    }
}