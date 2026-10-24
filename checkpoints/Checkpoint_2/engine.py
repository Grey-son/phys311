import numpy as np

# Objects

class Body:
    def __init__(self, m=1, r=(0,0), v=(0,0), radius=0.0, I=None, 
                 theta=0.0, omega=0.0, fixed=False, charge=None,
                 name=""):
        self.m = m
        self.r = np.array(r, dtype=float)
        self.v = np.array(v,dtype=float)
        self.radius = radius
        self.I = I if I is not None else 0.5*m*self.radius**2
        self.theta = float(theta)
        self.omega = float(omega)
        self.fixed = bool(fixed)
        self.q = charge if charge != 0.0 else None
        self.name = name
        self.cells = set()

        self.f = np.zeros(2)
        self.tau = 0.0

    @property
    def inv_m(self):
        return 0.0 if self.fixed or self.m == 0 else 1.0/self.m

    @property
    def inv_I(self):
        return 0.0 if self.fixed or self.I == 0.0 or self.I == None else 1.0/self.I

    def clear(self):
        self.f[:] = 0.0
        self.tau = 0.0

    # diagnostics

    def ke(self):
        k = 0.5*self.m*np.dot(self.v,self.v)
        if self.I:
            k += 0.5*self.I*self.omega**2
        return k

    def p(self):
        return self.m*self.v

    def L_about(self, origin=(0,0)):
        d = self.r - np.array(origin, dtype=float)
        Lz = self.m * (d[0]*self.v[1] - d[1]*self.v[0])
        if self.I:
            Lz += self.I*self.omega
        return Lz

class Wall:
    def __init__(self, start, end):
        self.a = np.array(start)
        self.b = np.array(end)
        self.cells = set()

# Contraints

class Constraint:
    def resolve(self, world):
        pass

class Body_Collisions(Constraint):
    def __init__(self, e=1.0):
        self.e = e
        self.count = 0

    def grid_search(self, b, world):
        if world.x_grid or world.y_grid:
            candidates = set()
            for cell in b.cells:
                candidates|=set(world.cells[cell])
            candidates.discard(b)
            return candidates
        return world.bodies

    def resolve_pair(self, b1, b2):
        d = b2.r - b1.r
        dist = np.linalg.norm(d)
        
        if dist == 0 or dist > b1.radius + b2.radius:
            return False
        
        n = d/dist
        v_rel = b2.v - b1.v
        vn = np.dot(v_rel,n)

        if vn > 0:
            return False

        inv_b1, inv_b2 = b1.inv_m, b2.inv_m
        if inv_b1 + inv_b2 == 0:
            return False
        
        J = -(1+self.e)*vn/(inv_b1+inv_b2)
        b1.v -= J*inv_b1*n
        b2.v += J*inv_b2*n

        overlap = b1.radius + b2.radius - dist
        b1.r -= n*overlap*inv_b1/(inv_b1+inv_b2)
        b2.r += n*overlap*inv_b2/(inv_b1+inv_b2)
        return True


    def resolve(self, world):
        bs = world.bodies
        body_index = {b: i for i, b in enumerate(bs)}
        for i in range(len(bs)):
            b1 = bs[i]
            candidates = self.grid_search(b1, world)
            for b2 in candidates:
                if b1.radius > 0 and b2.radius > 0:
                    if body_index[b2] < body_index[b1]:
                        if self.resolve_pair(b1,b2):
                            self.count += 1
                            world.regrid(b1)
                            world.regrid(b2)

class Wall_Collisions(Constraint):
    def __init__(self, e=1.0):
        self.e = e
        self.count = 0
        self.cells = set()

    def dist_vec(self, w, b):
        p = b.r
        ab = w.b - w.a
        ap = p - w.a
        if np.dot(ab, ab) == 0:
            return p-w.a
        t = np.dot(ab,ap)/np.dot(ab, ab)
        t = np.clip(t, 0, 1)
        ab_t = w.a + t*ab
        return p-ab_t

    def resolve_wall(self, b, d):
        if b.fixed:
            return False
        dist = np.linalg.norm(d)
        if dist == 0:
            return False
        normal = d/dist
        vn = np.dot(b.v, normal)
        if vn >= 0:
            return False
        J = -(1+self.e)*vn
        b.v += J * normal
        b.r += (b.radius-dist)*normal
        return True

    def resolve(self, world):
        ws = world.walls
        if world.x_grid or world.y_grid:
            for w in ws:
                candidates = set()
                for cell in w.cells:
                    candidates |= set(world.cells[cell])
                for b in candidates:
                    d = self.dist_vec(w, b)
                    dist = np.linalg.norm(d)
                    if dist - b.radius > 0:
                        continue
                    if self.resolve_wall(b, d):
                        self.count += 1
        else:
            bs = world.bodies
            for w in ws:
                for b in bs:
                    d = self.dist_vec(w, b)
                    dist = np.linalg.norm(d)
                    if dist - b.radius > 0:
                        continue
                    if self.resolve_wall(b, d):
                        self.count += 1

# Forces

class Force:
    def apply(self, world):
        raise NotImplementedError
    
    def potential_energy(self, world):
        return 0.0

class Gravity(Force):
    def __init__(self, g=9.81):
        self.gmag = g
        self.g = np.array([0.0, -g])

    def apply(self, world):
        for b in world.bodies:
            b.f += b.m * self.g

    def potential_energy(self, world):
        return sum(b.m * self.gmag * b.r[1] for b in world.bodies if not b.fixed)

class Drag(Force):
    def __init__(self, c, quadratic=True):
        self.c = c
        self.quadratic = quadratic

    def apply(self, world):
        for b in world.bodies:
            if b.fixed:
                continue
            speed = np.linalg.norm(b.v)
            if speed == 0:
                continue
            if self.quadratic:
                b.f += -self.c * speed * b.v
                continue
            b.f += -self.c * b.v

class Spring(Force):
    def __init__(self, b1, b2, r_0, k=1):
        self.k = k
        self.d_0 = r_0
        self.b1 = b1
        self.b2 = b2

    def apply(self, world):
        b1 = self.b1
        b2 = self.b2
        if b1 not in world.bodies or b2 not in world.bodies:
            return
        d = b2.r - b1.r
        dist = np.linalg.norm(d)
        if dist == 0:
            return
        F = self.k*(dist-self.d_0)*(d/dist)
        b1.f += F
        b2.f -= F

    def potential_energy(self, world):
        if self.b1 not in world.bodies or self.b2 not in world.bodies:
            return 0.0
        dist = np.linalg.norm(self.b2.r - self.b1.r)
        U = 0.5*self.k*(dist-self.d_0)**2
        return U

class Newtonian_Gravity(Force):
    def __init__(self, G=1.0):
        self.G = G

    def apply(self, world):
        bs = world.bodies
        for i in range(len(bs)):
            for j in range(i+1, len(bs)):
                d = bs[j].r - bs[i].r
                dist = np.linalg.norm(d)
                if dist == 0:
                    continue
                bs[i].f += bs[i].m*bs[j].m*self.G/dist**3 * d
                bs[j].f -= bs[i].m*bs[j].m*self.G/dist**3 * d

    def potential_energy(self, world):
        bs = world.bodies
        U = 0.0
        for i in range(len(bs)):
            for j in range(i+1, len(bs)):
                d = bs[j].r - bs[i].r
                dist = np.linalg.norm(d)
                if dist > 0:
                    U -= self.G*bs[i].m*bs[j].m/dist
        return U

class PivotGravityTorque(Force):
    def __init__(self, b, m, g, d):
        self.b = b
        self.m = m
        self.g = g
        self.d = d

    def apply(self, world):
        b = self.b
        if b not in world.bodies:
            return
        b.tau += -self.m*self.g*self.d*np.sin(b.theta)

    def potential_energy(self, world):
        b = self.b
        if b not in world.bodies:
            return 0.0
        return self.m*self.g*self.d*(1-np.cos(b.theta))

class Coulombic_Interaction(Force):
    def __init__(self, k=1):
        self.k = k

    def apply(self, world):
        bs = world.charged_bs
        for i in range(len(bs)):
            for j in range(i+1, len(bs)):
                d = bs[j].r - bs[i].r
                dist = np.linalg.norm(d)
                if dist == 0:
                    continue
                bs[i].f -= bs[i].q*bs[j].q*self.k/dist**3 * d
                bs[j].f += bs[i].q*bs[j].q*self.k/dist**3 * d

    def potential_energy(self, world):
        bs = world.charged_bs
        U = 0.0
        for i in range(len(bs)):
            for j in range(i+1, len(bs)):
                d = bs[j].r - bs[i].r
                dist = np.linalg.norm(d)
                if dist > 0:
                    U += self.k*bs[i].q*bs[j].q/dist
        return U

# Integrators

class Integrator:
    def step(self, world, dt):
        pass

class Euler(Integrator):
    def step(self, world, dt):
        for b in world.bodies:
            if b.fixed:
                continue
            a = b.f * b.inv_m
            b.r += b.v * dt
            b.v += a * dt
            alpha = b.tau * b.inv_I
            b.theta += b.omega * dt
            b.omega += alpha * dt

class Euler_Cromer(Integrator):
    def step(self, world, dt):
        for b in world.bodies:
            if b.fixed:
                continue
            a = b.f * b.inv_m
            b.v += a * dt
            b.r += b.v * dt
            alpha = b.tau * b.inv_I
            b.omega += alpha * dt
            b.theta += b.omega * dt

class Verlet(Integrator):
    def step(self, world, dt):
        if not world._primed:
            world.compute_forces()
            for b in world.bodies:
                if b.fixed:
                    continue
                b._a = b.f * b.inv_m
                b._al = b.tau * b.inv_I
            world._primed = True

        for b in world.bodies:
            if b.fixed:
                continue
            b.r += b.v*dt + 0.5*b._a*dt**2
            b.theta += b.omega*dt + 0.5*b._al*dt**2

        world.compute_forces()

        for b in world.bodies:
            if b.fixed:
                continue
            a_new = b.f * b.inv_m
            al_new = b.tau * b.inv_I
            b.v += 0.5*(a_new+b._a)*dt
            b.omega += 0.5*(al_new+b._al)*dt
            b._a, b._al = a_new, al_new

# World

class World:
    def __init__(self, integrator=None, forces=None, bodies=None, walls=None, 
                 constraints=None, x_ext=None, y_ext=None, grid_n=None,):
        self.bodies = list(bodies or [])
        self.charged_bs = [b for b in self.bodies if b.q is not None]
        self.forces = list(forces or [])
        self.walls = list(walls or [])
        self.constraints = list(constraints or [])
        self.integrator = integrator or Euler_Cromer()
        self.t = 0.0
        self._primed = False
        self.recorders = {}
        self.history = {}
        self.x_ext = np.array(x_ext) if x_ext is not None else None
        self.y_ext = np.array(y_ext) if y_ext is not None else None
        self.x_grid = False
        self.y_grid = False
        self.grid_n = grid_n

        if not isinstance(grid_n, int):
            return
        elif x_ext is None and y_ext is None:
            return
        elif y_ext is None:
            self.cells = {}
            for i in range(grid_n):
                self.cells[i] = []
            self.x_grid = True
        elif x_ext is None:
            self.cells = {}
            for j in range(grid_n):
                self.cells[j] = []
            self.y_grid = True
        else:
            self.cells = {}
            for i in range(grid_n):
                for j in range(grid_n):
                    self.cells[(i,j)] = []
                            
            self.x_grid = True
            self.y_grid = True

        for b in self.bodies:
            self.regrid(b)
        for w in self.walls:
            self.wall_init(w)

    def add(self, *objects):
        for obj in objects:
            if isinstance(obj,Body):
                self.bodies.append(obj)
                if obj.q is not None:
                    self.charged_bs.append(obj)
                if self.x_grid or self.y_grid:
                    self.regrid(obj)
            elif isinstance(obj,Wall):
                self.walls.append(obj)
                if self.x_grid or self.y_grid:
                    self.wall_init(obj)
            elif isinstance(obj,Force):
                self.forces.append(obj)
            elif isinstance(obj,Constraint):
                self.constraints.append(obj)

    def compute_forces(self):
        for b in self.bodies: 
            b.clear()
        for f in self.forces:
            f.apply(self)

    def step(self, dt):
        self.compute_forces()
        self.integrator.step(self, dt)
        self.handle_collisions()
        for b in self.bodies:
            self.regrid(b)
        self.t += dt

    def handle_collisions(self):
        for c in self.constraints:
            c.resolve(self)

    def regrid(self, b):
        if not self.x_grid and not self.y_grid:
            return
        for cell in b.cells:
            self.cells[cell].remove(b)
        if self.x_grid and self.y_grid:
            b.cells = set()
            cell_w = (self.x_ext[1]-self.x_ext[0])/self.grid_n
            cell_h = (self.y_ext[1]-self.y_ext[0])/self.grid_n
            low_x = max(0,
                        int(np.floor((b.r[0]-b.radius-self.x_ext[0])/cell_w)))
            high_x = min(self.grid_n-1,
                         int(np.floor((b.r[0]+b.radius-self.x_ext[0])/cell_w) + 1))
            low_y = max(0,
                        int(np.floor((b.r[1]-b.radius-self.y_ext[0])/cell_h)))
            high_y = min(self.grid_n-1,
                         int(np.floor((b.r[1]+b.radius-self.y_ext[0])/cell_h) + 1))
            if low_x > self.grid_n-1 or high_x < 0 or low_y > self.grid_n-1 or high_y < 0:
                return
            for i in range(low_x, high_x+1):
                x = self.x_ext[0] + i*cell_w
                for j in range(low_y, high_y+1):
                    y = self.y_ext[0] + j*cell_h
                    if  b.r[0] + b.radius >= x and\
                        b.r[0] - b.radius <= x + cell_w and\
                        b.r[1] + b.radius >= y and\
                        b.r[1] - b.radius <= y + cell_h:
                        self.cells[(i,j)].append(b)
                        b.cells.add((i,j))
        elif self.x_grid:
            b.cells = set()
            cell_w = (self.x_ext[1]-self.x_ext[0])/self.grid_n
            for i in range(self.grid_n):
                x = self.x_ext[0] + i*cell_w
                if  b.r[0] + b.radius >= x and\
                    b.r[0] - b.radius <= x + cell_w:
                    self.cells[i].append(b)
                    b.cells.add(i)
        elif self.y_grid:
            b.cells = set()
            cell_h = (self.y_ext[1]-self.y_ext[0])/self.grid_n
            for j in range(self.grid_n):
                y = self.y_ext[0] + j*cell_h
                if  b.r[1] + b.radius >= y and\
                    b.r[1] - b.radius <= y + cell_h:
                    self.cells[j].append(b)
                    b.cells.add(j)

    def wall_init(self,w):
        if self.x_grid and self.y_grid:
            cell_w = (self.x_ext[1]-self.x_ext[0])/self.grid_n
            cell_h = (self.y_ext[1]-self.y_ext[0])/self.grid_n
            for i in range(self.grid_n):
                x = self.x_ext[0] + i*cell_w
                for j in range(self.grid_n):
                    y = self.y_ext[0] + j*cell_h
                    if self.Line_Rect_Intersect(w.a, w.b, x, y, cell_w, cell_h):
                        w.cells.add((i,j))
        elif self.x_grid:
            cell_w = (self.x_ext[1]-self.x_ext[0])/self.grid_n
            x_min, x_max = min(w.a[0],w.b[0]), max(w.a[0],w.b[0])
            for i in range(self.grid_n):
                x = self.x_ext[0] + i*cell_w
                if x_max >= x and\
                    x_min <= x + cell_w:
                    w.cells.add(i)
        elif self.y_grid:
            cell_h = (self.y_ext[1]-self.y_ext[0])/self.grid_n
            y_min, y_max = min(w.a[1],w.b[1]), max(w.a[1],w.b[1])
            for j in range(self.grid_n):
                y = self.y_ext[0] + j*cell_h
                if y_max >= y and\
                    y_min <= y + cell_h:
                    w.cells.add(j)

    # Wall Intersections

    def Line_Rect_Intersect(self, a, b, x, y, w, h):
        x_min, x_max = x, x+w
        y_min, y_max = y, y+h

        dx = b[0] - a[0]
        dy = b[1] - a[1]

        p = (-dx, dx, -dy, dy)
        q = (a[0]-x_min, x_max-a[0],
             a[1]-y_min, y_max-a[1])

        t0, t1 = 0.0, 1.0

        for pi, qi in zip(p,q):
            if pi == 0:
                if qi < 0:
                    return False
            else:
                r = qi/pi
                if pi < 0:
                    t0 = max(t0, r)
                else:
                    t1 = min(t1,r)

                if t1 < t0:
                    return False

        return True

    # Diagnostics

    def kinetic_energy(self):
        return sum(b.ke() for b in self.bodies)
    def potential_energy(self):
        return sum(f.potential_energy(self) for f in self.forces)
    def total_energy(self):
        return self.kinetic_energy() + self.potential_energy()
    def momentum(self):
        return sum((b.p() for b in self.bodies), np.zeros(2))
    def angular_momentum(self, origin=(0,0)):
        return sum(b.L_about(origin) for b in self.bodies)

    def record(self, name, fn):
        self.recorders[name] = fn
        self.history[name] = []

    def capture(self):
        for k, fn in self.recorders.items():
            self.history[k].append(fn(self))

    def run(self, dt, end_t=10, capture_every=1, End_Condition=None):
        self.capture()
        i=0
        if End_Condition is not None:
            while not End_Condition(self):
                self.step(dt)
                i+=1
                if (i + 1) % capture_every == 0:
                    self.capture()
        else:
            while self.t < end_t:
                self.step(dt)
                i+=1
                if (i + 1) % capture_every == 0:
                    self.capture()
        return {k: np.array(v) for k, v in self.history.items()}