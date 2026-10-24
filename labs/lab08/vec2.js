class Vec2 {
    constructor(x, y) {
        this.x = x
        this.y = y
    }

    static add(u, v) {
        return new Vec2(u.x + v.x, u.y + v.y)
    }

    static sub(u, v) {
        return new Vec2(u.x - v.x,u.y - v.y)
    }

    static mul(c, u) {
        return new Vec2(c*u.x, c*u.y)
    }

    static dot(u, v) {
        return u.x*v.x + u.y*v.y
    }

    static length(u) {
        return Math.hypot(u.x,u.y)
    }

    static lengthsq(u) {
        return u.x**2 + u.y**2
    }

    static normalized(u) {
        const l = Vec2.length(u)

        if (l === 0) {
            throw new Error("Cannot Normalize Zero Vector!")
        }

        return new Vec2(u.x/l,u.y/l)
    }

    static clone(u) {
        return new Vec2(u.x, u.y)
    }

    addTo(v) {
        this.x += v.x
        this.y += v.y
    }

    addScaled(c,v) {
        this.x += c*v.x
        this.y += c*v.y
    }
}

export {Vec2}