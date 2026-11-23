import { Vec2 } from "./vec2.js";

let _nextId = 0
export class Body {
  constructor({ mass = 1, pos = new Vec2(), vel = new Vec2(), radius = 0.25,
                color = "#ff8200", fixed = false, uK = 0 } = {}) {
    this.mass = mass;
    this.invMass = fixed ? 0 : 1 / mass;
    this.pos = pos.clone();
    this.vel = vel.clone();
    this.acc = new Vec2();
    this.force = new Vec2();
    this.radius = radius;
    this.color = color;
    this.fixed = fixed;
    this.trail = [];
    this.id = _nextId++;
    this.grounded = false;
    this.uK = uK;
    this.baseUK = uK;
    this.touching = [];
  }
    get kineticEnergy() {return 0.5*this.mass*this.vel.lengthSq();}
  clone() {
    const copy = new Body({
      mass: this.mass,
      pos: this.pos.clone(),
      vel: this.vel.clone(),
      radius: this.radius,
      color: this.color,
      fixed: this.fixed,
      uK: this.uK
    });
    copy.baseUK = this.baseUK
    return copy
  }
}