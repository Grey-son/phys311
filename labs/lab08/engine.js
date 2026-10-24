import { Vec2 } from "./vec2.js"

//Body

class Body {
    constructor(pos = new Vec2(0,0), vel = new Vec2(0,0), m = 1, radius = 1) {
        this.pos = pos
        this.vel = vel
        this.m = m
        this.radius = radius
        this.force = new Vec2(0,0)
    }

    get acc() {
        return Vec2.mul(1/this.m,this.force)
    }

    clear() {
        this.force = new Vec2(0,0)
    }

    kinetic_energy() {
        return 0.5*this.m*Vec2.lengthsq(this.vel)
    }

    static clone(B) {
        return new Body(Vec2.clone(B.pos),Vec2.clone(B.vel),B.m,B.radius)
    }
}

//Integrators

class eulerCromer {
    step(world, dt) {
        for (const body of world.bodies) {
            body.vel.addTo(Vec2.mul(dt,body.acc))
            body.pos.addTo(Vec2.mul(dt,body.vel))
        }
    }

    get Class() {
        return eulerCromer
    }
}

class velocityVerlet {
    step(world, dt) {
        for (const body of world.bodies) {
            const dr = Vec2.mul(dt,body.vel)
            dr.addTo(Vec2.mul(0.5*dt**2,body.acc))
            body.pos.addTo(dr)
            body.vel.addTo(Vec2.mul(0.5*dt,body.acc))
        }
        world.computeForce()
        for (const body of world.bodies) {
            body.vel.addTo(Vec2.mul(0.5*dt,body.acc))
        }
    }

    get Class() {
        return velocityVerlet
    }
}
//Forces

class Gravity {
    constructor(g=9.81) {
        this.g = -g
    }

    apply(world) {
        for (const body of world.bodies) {
            body.force.addTo(new Vec2(0,this.g*body.m))
        }
    }

    potential_energy(world) {
        let u = 0
        for (const body of world.bodies) {
            u += this.g*body.pos.y*body.m
        }
        return u
    }

    static clone(force) {
        return new Gravity(force.g)
    }
}

//World

class World {
    constructor(Integrator = eulerCromer, dt=0.01, bodies = [], forces = []) {
        this.Integrator = new Integrator()
        this.dt = dt
        this.bodies = bodies
        this.forces = forces
    }

    computeForce() {
        for (const body of this.bodies) {
            body.clear()
        }
        for (const force of this.forces) {
            force.apply(this)
        }
    }

    step() {
        this.computeForce()
        this.Integrator.step(this, this.dt)
    }

    copy() {
        const bodies_copy = []
        for (const body of this.bodies)
            bodies_copy.push(Body.clone(body))
        return new World(this.Integrator.Class,this.dt,bodies_copy,this.forces)
    }
}

export {Body, velocityVerlet, eulerCromer, Gravity, World}