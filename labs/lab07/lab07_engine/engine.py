print("ENGINE LOADED")

import numpy as np

# Objects

class Body:
    def __init__(self, mass, pos, vel, radius=0.1, I=None):
        self.m = mass
        self.r = np.array(pos, dtype=float)
        self.v = np.array(vel,dtype=float)
        self.radius = radius
        self.theta = 0.0
        self.omega = 0.0
        self.I = I if I is not None else 0.5*mass*radius**2
        self.force = np.zeros(2)
        self.torque = 0.0

    def clear_accumulators(self):
        self.force = np.zeros(2)
        self.torque = 0.0

    def collide_1d(self, b2, normal, e=1):

        m1, u1, pos1, rad1 = self.m, self.v.copy(), self.r, self.radius
        m2, u2, pos2, rad2 = b2.m, b2.v.copy(), b2.r, b2.radius

        v1 = np.dot(u1, normal)
        v2 = np.dot(u2, normal)

        m_total = m1 + m2
        v_cm = (m1*v1 + m2*v2) / m_total

        v1_new = v_cm - e * (m2 / m_total) * (v1 - v2)
        v2_new = v_cm + e * (m1 / m_total) * (v1 - v2)

        overlap =  rad1+rad2 - np.linalg.norm(pos1 - pos2)
        
        self.v, self.r = u1 + (v1_new - v1)*normal, pos1 + 0.5*overlap*normal
        b2.v, b2.r = u2 + (v2_new - v2)*normal, pos2 - 0.5*overlap*normal

    def collide_2d(self, b2, e=1):

        u1, pos1 = self.v, self.r
        u2, pos2 = b2.v, b2.r

        dist = pos1 - pos2

        if np.linalg.norm(dist) == 0:
            return

        normal = dist/np.linalg.norm(dist)

        if np.dot(u1-u2, normal) < 0:
            self.collide_1d(b2, normal, e)

    def collide_wall(self, dist_vec, e=1):

        normal = dist_vec/np.linalg.norm(dist_vec)

        m, u, pos, rad = self.m, self.v.copy(), self.r, self.radius
        v = np.dot(u, normal)

        if v >= 0:
            return

        self.v += -(1+e)*v*normal
        self.r += (rad-np.linalg.norm(dist_vec))*normal

class Wall:
    def __init__(self, start, end):
        self.a = np.array(start)
        self.b = np.array(end)

    def dist_vec(self, body):
        p = body.r
        ab = self.b - self.a
        ap = p - self.a
        if np.dot(ab, ab) == 0:
            return np.linalg.norm(self.a-p)
        t = np.dot(ab,ap)/np.dot(ab, ab)
        t = max(0, min(1, t))
        ab_t = self.a + t*ab
        dist_vec = p-ab_t
        return dist_vec

# Forces

class Gravity:
    def __init__(self, g=9.81):
        self.g = np.array([0.0, g])
    def apply(self, world):
        for b in world.bodies:
            b.force += b.m * self.g

class Drag:
    def __init__(self, c):
        self.c = c
    def apply(self, world):
        for b in world.bodies:
            b.force += -self.c * np.linalg.norm(b.v) * b.v

class Spring:
    def __init__(self, origin, r_0, k=1):
        self.k = k
        self.o = np.array(origin)
        self.r_0 = r_0
        self.couples = []
    def couple(self, body):
        self.couples.append(body)
    def apply(self, world):
        for b in self.couples:
            if b in world.bodies:
                dist = np.linalg.norm(b.r - self.o)
                b.force += -self.k*(dist-self.r_0)*(b.r - self.o)

class Newtonian_Gravity:
    def __init__(self, G=1):
        self.G = G
    def apply(self, world):
        n = len(self.bodies)
        for i in range(n):
            for j in range(i+1, n):
                b1 = world.bodies[i]
                b2 = world.bodies[j]
                if b1 == b2:
                    continue
                dist = np.linalg.norm(b2.r - b1.r)
                b1.force += b1.m*b2.m*self.G/np.linalg.norm(dist)**3 * (b2.r-b1.r)
                b2.force += b1.m*b2.m*self.G/np.linalg.norm(dist)**3 * (b1.r-b2.r)

# Integrators

class Euler_Cromer:
    def step(self, world, dt):
        for b in world.bodies:
            a = b.force / b.m
            b.v += a * dt
            b.r += b.v * dt
            alpha = b.torque / b.I
            b.omega += alpha * dt
            b.theta += b.omega * dt

# World

class World:
    def __init__(self, integrator):
        self.bodies = []
        self.forces = []
        self.walls = []
        self.integrator = integrator
        self.time = 0.0

    def add_body(self, body): self.bodies.append(body)
    def add_force(self, force): self.forces.append(force)
    def add_wall(self, wall): self.walls.append(wall)

    def step(self, dt):
        for b in self.bodies: 
            b.clear_accumulators()
        for f in self.forces:
            f.apply(self)
        self.integrator.step(self, dt)
        self.handle_collisions()
        self.time += dt

    def handle_collisions(self):
        n = len(self.bodies)
        for i in range(n):
            for j in range(i+1, n):

                b1 = self.bodies[i]
                b2 = self.bodies[j]

                dist = np.linalg.norm(b1.r - b2.r)

                if dist <= b1.radius+b2.radius:
                    b1.collide_2d(b2)
        for w in self.walls:
            for b in self.bodies:
                dist_vec = w.dist_vec(b)
                dist = np.linalg.norm(dist_vec)
                if dist < b.radius:
                    b.collide_wall(dist_vec)