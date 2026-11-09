import { EulerCromer } from "./integrators.js";
import { Vec2 } from "./vec2.js";
import { SpatialHash } from "./constraints.js";

export class World {
    constructor(Integrator = EulerCromer) {
        this.Integrator = Integrator;
        this.bodies = [];
        this.forces = [];
        this.constraints = [];
        this.time = 0;
        this.steps = 0;
        this.grid = new SpatialHash();
    }
    add(b) {this.bodies.push(b);}
    addForce(f) {this.forces.push(f);}
    addConstraint(c) {this.constraints.push(c);}

    clearForces() {for (const b of this.bodies) b.force.zero();}
    applyForces() {for (const f of this.forces) f.apply(this);}
    resolveConstraints() {
        for (const c of this.constraints) {
            if (c.usesBroadPhase) {
                const pairs = this.grid.build(this.bodies);
                c.resolve(this, pairs);
            } else {
                c.resolve(this);
            }
        }
    }

    primeAccelerations() {
        this.clearForces(); this.applyForces();
        for (const b of this.bodies) {
            if (b.fixed) continue;
            b.acc.set(b.force.x*b.invMass, b.force.y*b.invMass);
        }
    }

    step(dt) {
        this.clearForces();
        this.applyForces();
        this.Integrator.step(this, dt);
        this.resolveConstraints(this);
        this.time += dt;
        this.steps += 1;
    }

    kineticEnergy() {
        let K = 0;
        for (const b of this.bodies) {K += b.kineticEnergy;}
        return K;
    }
    potentialEnergy() {
        let U = 0;
        for (const f of this.forces) if (f.potentialEnergy) {U += f.potentialEnergy(this);}
        return U;
    }
    totalEnergy() {return this.kineticEnergy() + this.potentialEnergy();}
    absMomentum() {
        let P = new Vec2();
        for (const b of this.bodies) {P.addScaled(b.mass,b.vel);}
        return P.length();
    }
}