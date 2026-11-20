export class Vec2 {
    constructor(x=0, y=0) {this.x = x; this.y = y;}

    add(v)     {return new Vec2(this.x + v.x, this.y + v.y);}
    sub(v)     {return new Vec2(this.x - v.x, this.y - v.y);}
    mul(c)     {return new Vec2(c*this.x, c*this.y);}
    dot(v)     {return this.x*v.x + this.y*v.y;}
    length()   {return Math.hypot(this.x,this.y);}
    lengthSq() {return this.x**2 + this.y**2;}
    clone()    {return new Vec2(this.x, this.y);}

    normalized() {
        const L = this.length();
        return L === 0? new Vec2(0,0) : new Vec2(this.x/L,this.y/L);
    }

    addTo(v) {this.x += v.x; this.y += v.y; return this;}
    addScaled(c,v) {this.x += c*v.x; this.y += c*v.y; return this;}
    set(x,y) {this.x = x; this.y = y; return this;}
    zero() {this.x = 0; this.y = 0; return this;}
}