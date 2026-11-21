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
    constructor({
        strength = 18,
        maxPull = 8,
        duration = 0.18,
        maxImpulse = Infinity
    } = {}) {

        this.strength = strength;
        this.maxPull = maxPull;
        this.duration = duration;

        // Maximum impulse magnitude, in N*s.
        this.maxImpulse = Math.max(0, maxImpulse);

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
        if (this.active) {this.pull = pull.clone();}
    }

    impulseForPull(pull) {

        const distance = Math.min(pull.length(),this.maxPull);

        if (distance === 0) return new Vec2();

        const direction = pull.normalized().mul(-1);

        // Integrated impulse from the original force model.
        const rawMagnitude =this.strength * distance * this.duration / 2;

        // Apply the level-specific impulse limit.
        const impulseMagnitude = Math.min(rawMagnitude,this.maxImpulse);

        return direction.mul(impulseMagnitude);
    }

    applyImpulse(body, pull = this.pull) {
        if (!body || body.fixed || body.invMass === 0) {return new Vec2();}
        const impulse = this.impulseForPull(pull);
        body.vel.addScaled(body.invMass, impulse);
        return impulse;
    }

    release() {
        if (!this.active) return new Vec2();
        const impulse = this.applyImpulse(this.body,this.pull);
        this.active = false;
        return impulse;
    }

    apply() {}
}

export class SlidingFriction {
    constructor( contactEps = 1e-6, stopEps = 1e-2) {
        this.contactEps = contactEps;
        this.isContactForce = true;
    }

    apply(world) {
        const dt = world.dt;

        for (const b1 of world.bodies) {

            if (b1.touching.length === 0) continue;

            for (const b2 of b1.touching) {

                if (b1.id >= b2.id) continue;

                const invMassSum = b1.invMass + b2.invMass;

                if (invMassSum === 0) continue;

                const d = b2.pos.sub(b1.pos);
                const dist = d.length();

                if (dist === 0) continue;

                const n = d.mul(1 / dist);
                const vRel = b2.vel.sub(b1.vel);
                const vT = vRel.sub(n.mul(vRel.dot(n)));
                const speedT = vT.length();

                if (speedT < this.contactEps) continue;

                const a1 = b1.force.mul(b1.invMass);
                const a2 = b2.force.mul(b2.invMass);
                const aRel = a2.sub(a1);
                const normalAcceleration = aRel.dot(n);
                const N = Math.max(0,-normalAcceleration / invMassSum);

                if (N === 0) continue;

                const muK = (b1.uK + b2.uK) / 2;

                if (muK <= 0) continue;

                let frictionMagnitude = muK * N;

                if (dt > 0) {
                    const maxStoppingForce =speedT / (invMassSum * dt);
                    frictionMagnitude = Math.min(frictionMagnitude,maxStoppingForce);
                }

                const f = vT.mul(-frictionMagnitude / speedT);

                if (!b1.fixed) {b1.force.addTo(f.mul(-1));}
                if (!b2.fixed) {b2.force.addTo(f);}
            }
        }
    }

    potentialEnergy(world) {return 0;}
}