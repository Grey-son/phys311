import { Vec2 } from "./vec2.js";

export class BodyCollisions {
    constructor(e=1, eps=0) {this.e=e; this.count=0; this.eps=eps, this.contactTolerance=1e-6}
    resolvePair(b1,b2) {
        const d = b2.pos.sub(b1.pos)
        const dist = d.length()
        if (dist === 0 || dist > b1.radius + b2.radius) {return false}

        const n = d.mul(1/dist)
        const v_rel = b2.vel.sub(b1.vel)
        const vn = v_rel.dot(n)

        if (vn>0) {return false}
        if (b1.invMass + b2.invMass === 0) {return false}

        if (v_rel.length()>this.eps) {
            const J = -(1+this.e)*vn/(b1.invMass+b2.invMass)
            b1.vel.addScaled(-J*b1.invMass,n)
            b2.vel.addScaled(J*b2.invMass,n)
        } 
        if (v_rel.length<=this.eps) {
            b1.vel.addScaled(-b1.vel.dot(vn), n)
            b2.vel.addScaled(-b2.vel.dot(vn), n)
        }

        const overlap = b1.radius + b2.radius - dist
        b1.pos.addScaled(-overlap*b1.invMass/(b1.invMass+b2.invMass),n)
        b2.pos.addScaled(overlap*b2.invMass/(b1.invMass+b2.invMass),n)
        return true
    }
    updateContacts(world) {
        for (const body of world.bodies) {body.touching = [];}

        for (let i = 0; i < world.bodies.length; i++) {
            const b1 = world.bodies[i];

            for (let j = i + 1; j < world.bodies.length; j++) {
                const b2 = world.bodies[j];

                const d = b2.pos.sub(b1.pos);
                const dist = d.length();

                const contactDistance = b1.radius + b2.radius;

                if (dist <= contactDistance + this.contactTolerance) {
                    b1.touching.push(b2);
                    b2.touching.push(b1);
                }
            }
        }
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