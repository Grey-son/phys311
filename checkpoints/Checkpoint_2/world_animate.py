from matplotlib.animation import FuncAnimation, FFMpegWriter
import matplotlib.patches as mpatch
import matplotlib.pyplot as plt
import numpy as np
import engine as eng

def animate_world(world, dt=0.01, x_ext=(-5,5), y_ext=(-5,5), frames=10000, interval=10, update_every=1, 
                  filename="worldanimation.mp4", fps=30, show={}):
    fig, ax = plt.subplots()

    ax.set_xlim(x_ext[0], x_ext[1])
    ax.set_ylim(y_ext[0], y_ext[1])
    ax.set_aspect("equal", adjustable='box')

    world.record("bs_traj", 
                 lambda w: np.array([b.r.copy() for b in w.bodies]))
    i = 0.05
    annotations = []
    records = []
    for name, func in show.items():
        world.record(name, func)
        ann = ax.annotate(
            name+':',
            xy=(1.05,1.00-i),
            xycoords='axes fraction'
        )
        annotations.append(ann)
        i+=0.05
    hist = world.run(dt, end_t=dt*(frames-1)*update_every, capture_every = update_every)

    for w in world.walls:
        plt.plot([w.a[0], w.b[0]], [w.a[1], w.b[1]], color="k")

    Circles = []
    for b, r in zip(world.bodies, hist["bs_traj"][0,:]):
        if b.q is None:
            color = "k" 
        elif b.q<0:
            color = "r" 
        else:
            color = "b"
        circle = mpatch.Circle( 
            r, radius=b.radius, animated=True, color=color)
        ax.add_patch(circle)
        Circles.append(circle)

    b_ind = {
        b: i for i, b in enumerate(world.bodies)
    }

    Springs = [s for s in world.forces if isinstance(s,eng.Spring)]
    s_ind = {
        s: (b_ind[s.b1],b_ind[s.b2]) for s in Springs
    }
    Lines = []
    positions = hist["bs_traj"][0]
    for s in Springs:
        i, j = s_ind[s]
        (line,) = ax.plot([positions[j,0],positions[i,0]],
                          [positions[j,1],positions[i,1]])
        d = np.linalg.norm(positions[i]-positions[j])
        if d == 0:
            color = (0,0,1)
        elif d > s.d_0:
            color = (np.clip((d/s.d_0)/2,0,1),0,0)
        else:
            color = (0,0,np.clip((s.d_0/d)/2,0,1))
        line.set_color(color)
        Lines.append(line)

    def init():
        return update(0)

    def update(frame):
        positions = hist["bs_traj"][frame]
        for circle, r in zip(Circles, positions):
            circle.center = r
        for line, s in zip(Lines, Springs):
            i, j = s_ind[s]
            line.set_xdata([positions[j,0],positions[i,0]])
            line.set_ydata([positions[j,1],positions[i,1]])
            d = np.linalg.norm(positions[i]-positions[j])
            if d == 0:
                color = (0,0,1)
            elif d > s.d_0:
                color = (np.clip((d/s.d_0)/2,0,1),0,0)
            else:
                color = (0,0,np.clip((s.d_0/d)/2,0,1))
            line.set_color(color)
        for ann, name in zip(annotations, show.keys()):
            ann.set_text(name+f': {hist[name][frame]:.3f}')
        return Circles + Lines + annotations

    anim = FuncAnimation(
        fig,
        update,
        init_func=init,
        frames=frames,
        interval=interval,
        blit=True
    )

    writer = FFMpegWriter(fps=fps, codec="h264", bitrate=1500, extra_args=["-pix_fmt", "yuv420p"])
    anim.save(filename, writer=writer, dpi=100)
    plt.close(fig)
    
    return anim