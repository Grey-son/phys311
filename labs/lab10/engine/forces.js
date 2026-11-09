import { Vec2 } from "./vec2.js";

export class Gravity {
    constructor(g = 9.81) {this.g = g;}
    apply(world) {
        for (const b of world.bodies) {
            if (b.fixed) continue;
            b.force.y -= b.mass * this.g;
        }
    }

    potentialEnergy(world) {
        let U = 0;
        for (const b of world.bodies) {
            if (!b.fixed) {
                U += this.g * b.pos.y * b.mass;
            }
        }
        return U;
    }

    clone() {return new Gravity(this.g);}
}

export class Drag {
    constructor(c = 0, quadratic = true) {
        this.c = c;
        this.quadratic = quadratic;
    }

    apply(world) {
        for (const b of world.bodies) {
            if (b.fixed) continue;
            const speed = b.vel.length();
            if (this.quadratic) {
                b.force.addScaled(-this.c * speed,b.vel);
            } else {
                b.force.addScaled(-this.c,b.vel);
            }
        }
    }

    potentialEnergy() {return 0;}

    clone() {return new Drag(this.c, this.quadratic);}
}

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

export class Spring {
    constructor(B1, B2, k = 1, d_0 = 1) {
        this.b1 = B1;
        this.b2 = B2;
        this.k = k;
        this.d_0 = d_0;
    }

    apply(world) {
        if (
            !world.bodies.includes(this.b1) ||
            !world.bodies.includes(this.b2)
        ) return;

        const d = this.b1.pos.sub(this.b2.pos);
        const dist = d.length();

        if (dist === 0) return;
        const F = d.mul(this.k * (dist - this.d_0) / dist);

        this.b2.force.addTo(F);
        this.b1.force.addScaled(-1, F);
    }

    potentialEnergy(world) {
        if (
            !world.bodies.includes(this.b1) ||
            !world.bodies.includes(this.b2)
        ) return 0;

        const d = this.b1.pos.sub(this.b2.pos);
        const dist = d.length();
        return 0.5 * this.k * (dist - this.d_0) ** 2;
    }
}

export class MouseSpring {

    constructor(body, target, k = 80, damping = 16) {
        this.body = body;
        this.target = target.clone();
        this.k = k;
        this.damping = damping;
    }

    apply(world) {
        if (!world.bodies.includes(this.body)) return;

        const displacement = this.target.sub(this.body.pos);
        
        const springForce = displacement.mul(this.k);
        const dampingForce = this.body.vel.mul(-this.damping);

        this.body.force.addTo(springForce);
        this.body.force.addTo(dampingForce);
    }
}