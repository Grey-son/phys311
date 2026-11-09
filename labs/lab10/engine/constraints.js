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

export class xWall {
    constructor(center, width, e=1) {
        this.Cx = center; this.w=width; this.e = e; this.impulses = {left: 0,right: 0};
    }
    resolve(world) {
        for (const b of world.bodies) {
            if (b.pos.x - b.radius < this.Cx-this.w/2) {
                if (!b.fixed) {
                    this.impulses.left += b.mass * (1 + this.e) * Math.abs(b.vel.x);
                }
                b.vel.x = -b.vel.x*this.e; b.pos.x = this.Cx-this.w/2 + b.radius;
            } if (b.pos.x + b.radius > this.Cx+this.w/2) {
                if (!b.fixed) {
                    this.impulses.right += b.mass * (1 + this.e) * Math.abs(b.vel.x);
                }
                b.vel.x = -b.vel.x*this.e; b.pos.x = this.Cx+this.w/2 - b.radius;
            }
        }
    }
    takeImpulses() {
        const result = {...this.impulses};
        this.impulses.left = 0; this.impulses.right = 0; return result;
    }
}

export class yWall {
    constructor(center, height, e=1) {
        this.Cy = center; this.h=height; this.e = e; this.impulses = {top: 0,bottom: 0};
    }
    resolve(world) {
        for (const b of world.bodies) {
            if (b.pos.y - b.radius < this.Cy-this.h/2) {
                if (!b.fixed) {
                    this.impulses.bottom += b.mass * (1 + this.e) * Math.abs(b.vel.y);
                }
                b.vel.y = -b.vel.y*this.e; b.pos.y = this.Cy-this.h/2 + b.radius;
            } if (b.pos.y + b.radius > this.Cy+this.h/2) {
                if (!b.fixed) {
                    this.impulses.top += b.mass * (1 + this.e) * Math.abs(b.vel.y);
                }
                b.vel.y = -b.vel.y*this.e; b.pos.y = this.Cy+this.h/2 - b.radius;
            }
        }
    }
    takeImpulses() {
        const result = {...this.impulses};
        this.impulses.top = 0; this.impulses.bottom = 0; return result;
    }
}

export class BodyCollisions {
    constructor(e=1) {this.e=e;this.count=0;this.usesBroadPhase = true;this.pairChecks = 0;}
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
    resolve(world, candidatePairs) {
        this.pairChecks = 0;
        for (const [i, j] of candidatePairs) {
            const b1 = world.bodies[i];
            const b2 = world.bodies[j];
            this.pairChecks++;
            this.resolvePair(b1, b2);
        }
    }
}

export class SpatialHash {
    constructor(cellSize = null) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.candidateCount = 0;
        this.possiblePairCount = 0;
    }
    cellKey(x, y) {
        return `${x},${y}`;
    }
    build(bodies) {
        this.grid.clear();
        const N = bodies.length;
        this.possiblePairCount = N * (N - 1) / 2;
        this.candidateCount = 0;

        if (N < 2) return [];

        // Automatically choose a cell size based on the largest diameter.
        let maxRadius = 0;

        for (const b of bodies) {
            maxRadius = Math.max(maxRadius, b.radius);
        }

        const size = this.cellSize ?? Math.max(2 * maxRadius, 1e-6);

        // Insert each body into every cell its bounding box intersects.
        for (let i = 0; i < N; i++) {
            const b = bodies[i];

            const minX = Math.floor((b.pos.x - b.radius) / size);
            const maxX = Math.floor((b.pos.x + b.radius) / size);
            const minY = Math.floor((b.pos.y - b.radius) / size);
            const maxY = Math.floor((b.pos.y + b.radius) / size);

            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    const key = this.cellKey(x, y);

                    if (!this.grid.has(key)) {
                        this.grid.set(key, []);
                    }

                    this.grid.get(key).push(i);
                }
            }
        }

        // Generate unique candidate pairs from occupied cells.
        const pairs = [];
        const seen = new Set();

        for (const cell of this.grid.values()) {
            for (let i = 0; i < cell.length; i++) {
                for (let j = i + 1; j < cell.length; j++) {
                    const a = Math.min(cell[i], cell[j]);
                    const b = Math.max(cell[i], cell[j]);

                    const key = a * N + b;

                    if (seen.has(key)) continue;

                    seen.add(key);
                    pairs.push([a, b]);
                }
            }
        }
        this.candidateCount = pairs.length;

        return pairs;
    }
}