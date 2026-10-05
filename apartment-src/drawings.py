"""2D drawings from the traced plan: dimensioned floor plan (A3, 1:50) and exterior elevations (A3, 1:50)."""
import json, math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Arc, Rectangle, FancyBboxPatch
from matplotlib.backends.backend_pdf import PdfPages
import numpy as np

S, OX, OY, H = 119.7, 313, 1383, 2.60
G = json.load(open('geom.json'))
PL = json.load(open('web/plan.json'))
P = lambda p: np.array([(p[0] - OX) / S, (OY - p[1]) / S])

INK, WALL, MUTED, ACC, FLOOR, TILE = '#1f1d1a', '#3c3a35', '#8a8378', '#b5672e', '#f4efe6', '#e4e1dc'
A3 = (420 / 25.4, 297 / 25.4)
SCALE = 50  # 1:50  -> 1 m = 20 mm


def sheet(title, sub, xmin, ymin):
    """Figure with an axes where data units are metres at 1:50 on A3."""
    fig = plt.figure(figsize=A3)
    mm = 1000 / SCALE  # mm on paper per metre
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(xmin, xmin + 420 / mm)
    ax.set_ylim(ymin, ymin + 297 / mm)
    ax.set_aspect('equal')
    ax.axis('off')
    # title block
    x0, y0 = xmin + 420 / mm - 118 / mm, ymin + 12 / mm
    ax.add_patch(Rectangle((x0, y0), 108 / mm, 30 / mm, fill=False, lw=0.8, ec=INK))
    ax.text(x0 + 4 / mm, y0 + 21 / mm, title, fontsize=11, weight='bold', color=INK, va='center')
    ax.text(x0 + 4 / mm, y0 + 13 / mm, sub, fontsize=7.5, color=INK, va='center')
    ax.text(x0 + 4 / mm, y0 + 6 / mm, 'Scale 1:50 at A3 · traced from the sales plan, ±5 cm',
            fontsize=6.5, color=MUTED, va='center')
    return fig, ax, mm


def dim(ax, a, b, off, label=None, fs=7, color=INK, tick=0.08):
    a, b = np.array(a, float), np.array(b, float)
    d = b - a
    L = np.linalg.norm(d)
    u = d / L
    n = np.array([-u[1], u[0]])
    a2, b2 = a + n * off, b + n * off
    ax.plot([a2[0], b2[0]], [a2[1], b2[1]], color=color, lw=0.6)
    for p, q in ((a, a2), (b, b2)):
        ax.plot([p[0] + n[0] * np.sign(off) * 0.05, q[0] + n[0] * np.sign(off) * 0.12],
                [p[1] + n[1] * np.sign(off) * 0.05, q[1] + n[1] * np.sign(off) * 0.12], color=color, lw=0.4)
        t = (u + n) * tick / 1.4
        ax.plot([q[0] - t[0], q[0] + t[0]], [q[1] - t[1], q[1] + t[1]], color=color, lw=0.9)
    m = (a2 + b2) / 2 + n * np.sign(off if off else 1) * 0.14
    ang = math.degrees(math.atan2(u[1], u[0]))
    if ang > 90: ang -= 180
    if ang < -90: ang += 180
    ax.text(m[0], m[1], label or f'{L:.2f}', fontsize=fs, color=color, ha='center', va='center', rotation=ang,
            bbox=dict(fc='white', ec='none', pad=0.6))


# ------------------------------------------------------------------ floor plan
def floor_plan(pdf):
    fig, ax, mm = sheet('Floor plan', 'Copenhagen apartment · walls, openings, kitchen, sockets', -3.2, -2.8)
    floor = np.array(PL['floor'])
    ax.add_patch(Polygon(floor, closed=True, fc=FLOOR, ec='none', zorder=0))
    bal = np.array(PL['balcony'])
    ax.add_patch(Polygon(bal, closed=True, fc='#ebe7e0', ec=INK, lw=0.7, zorder=1))
    bath = np.array([P(p) for p in [(1170, 1000), (1498, 1022), (1482, 1272), (1152, 1248)]])
    ax.add_patch(Polygon(bath, closed=True, fc=TILE, ec='none', hatch='++', lw=0, zorder=0.5))
    for rings in PL['walls']:
        for k, r in enumerate(rings):
            ax.add_patch(Polygon(np.array(r), closed=True, fc=WALL if k == 0 else FLOOR, ec=INK, lw=0.5, zorder=3))
    # openings
    cen = P((900, 850))
    for o in G['openings']:
        q = np.array([P(p) for p in o['q']])
        e01, e03 = q[1] - q[0], q[3] - q[0]
        if np.linalg.norm(e01) >= np.linalg.norm(e03):
            a0, a1 = (q[0] + q[3]) / 2, (q[1] + q[2]) / 2
            td = e03 / np.linalg.norm(e03); th = np.linalg.norm(e03)
        else:
            a0, a1 = (q[0] + q[1]) / 2, (q[3] + q[2]) / 2
            td = e01 / np.linalg.norm(e01); th = np.linalg.norm(e01)
        ax.add_patch(Polygon(q, closed=True, fc='white', ec=INK, lw=0.5, zorder=4))
        L = np.linalg.norm(a1 - a0)
        if o['kind'] in ('window', 'balcony'):
            for off in (-0.02, 0.02):
                ax.plot([a0[0] + td[0] * off, a1[0] + td[0] * off], [a0[1] + td[1] * off, a1[1] + td[1] * off],
                        color=INK, lw=0.5, zorder=5)
            # width label outside
            mid = (a0 + a1) / 2
            out = td if np.linalg.norm(mid + td - cen) > np.linalg.norm(mid - td - cen) else -td
            lab = f"{L:.2f}"
            c = mid + out * (th / 2 + 0.28)
            ang = math.degrees(math.atan2((a1 - a0)[1], (a1 - a0)[0]))
            if ang > 90: ang -= 180
            if ang < -90: ang += 180
            ax.text(c[0], c[1], lab, fontsize=6.5, color=ACC, ha='center', va='center', rotation=ang, zorder=6)
        else:
            if o['name'] in ('door_entry', 'door_tek1', 'door_tek2'):
                ax.plot(*zip(a0, a1), color=INK, lw=1.2, zorder=5)
                if o['name'] == 'door_entry':
                    # swing into the hall
                    hinge, leafd = a0, -td
                    tip = hinge + leafd * L
                    ax.plot(*zip(hinge, tip), color=INK, lw=0.9, zorder=5)
                    ang0 = math.degrees(math.atan2(*(a1 - hinge)[::-1]))
                    ang1 = math.degrees(math.atan2(*(tip - hinge)[::-1]))
                    lo, hi = sorted([ang0, ang1])
                    if hi - lo > 180: lo, hi = hi, lo + 360
                    ax.add_patch(Arc(hinge, 2 * L, 2 * L, theta1=lo, theta2=hi, lw=0.5, color=INK, zorder=5))
            else:
                into = {'door_vaer': 1, 'door_bed': -1, 'door_bath': -1}[o['name']]
                hinge = a1
                leafd = td * (-into)
                tip = hinge + leafd * L
                ax.plot(*zip(hinge, tip), color=INK, lw=0.9, zorder=5)
                ang0 = math.degrees(math.atan2(*(a0 - hinge)[::-1]))
                ang1 = math.degrees(math.atan2(*(tip - hinge)[::-1]))
                lo, hi = sorted([ang0, ang1])
                if hi - lo > 180: lo, hi = hi, lo + 360
                ax.add_patch(Arc(hinge, 2 * L, 2 * L, theta1=lo, theta2=hi, lw=0.5, color=INK, zorder=5))
    # kitchen (same numbers as the Blender model)
    KX0, KY0 = P((370, 1326)); TEK = P((851, 0))[0]; END = P((0, 1040))[1]; D = 0.6
    kit = dict(fc='white', ec=INK, lw=0.6, zorder=2)
    ax.add_patch(Rectangle((KX0, KY0), 0.62, D, **kit, hatch='//'))
    ax.add_patch(Rectangle((KX0 + 0.62, KY0), TEK - KX0 - 0.62, D, **kit))
    ax.add_patch(Rectangle((TEK - D, KY0 + D), D, END - KY0 - D, **kit))
    ax.plot([KX0 + 0.62, TEK - D], [KY0 + D, KY0 + D], color='white', lw=1.2, zorder=2.1)
    for dx, dy in [(0.14, 0.2), (0.4, 0.2), (0.14, 0.55), (0.4, 0.55)]:
        ax.add_patch(plt.Circle((TEK - D + 0.03 + dx, KY0 + D + 0.3 + dy + 0.05), 0.08, fill=False, lw=0.5, color=INK, zorder=3))
    sx = P((632, 0))[0]
    ax.add_patch(Rectangle((sx - 0.25, KY0 + 0.12), 0.5, 0.4, fc='white', ec=INK, lw=0.5, zorder=3))
    ax.text(KX0 + 0.31, KY0 + 0.3, 'fridge /\ntall', fontsize=5, ha='center', va='center', color=MUTED, zorder=4)
    # rooms
    labels = {'living': (P((600, 720)), 'Køkken-alrum'), 'vaer': (P((1040, 600)), 'Værelse'),
              'bed': (P((1360, 720)), 'Soveværelse'), 'bath': (P((1300, 1140)), 'Bad'),
              'hall': (P((1050, 1080)), 'Entré'), 'tek': (P((903, 1180)), 'Teknik'), 'bal': (P((560, 230)), 'Altan')}
    dims = {r['id']: r['dim'] for r in PL['rooms']}
    for rid, (pt, name) in labels.items():
        ax.text(pt[0], pt[1] + 0.12, name, fontsize=9 if rid != 'tek' else 6.5, weight='bold', color=INK,
                ha='center', va='center', rotation=90 if rid == 'tek' else 0, zorder=6)
        if dims.get(rid):
            ax.text(pt[0], pt[1] - 0.2, dims[rid], fontsize=7, color=MUTED, ha='center', va='center', zorder=6)
    # plan dimensions (interior, as printed on the sales plan)
    for d in PL['dims']:
        a, b = np.array(d['a']), np.array(d['b'])
        ax.plot(*zip(a, b), color=ACC, lw=0.5, zorder=5, ls=(0, (4, 2)))
        m = (a + b) / 2
        ang = math.degrees(math.atan2((b - a)[1], (b - a)[0]))
        if ang > 90: ang -= 180
        if ang < -90: ang += 180
        ax.text(m[0], m[1], d['label'], fontsize=6.5, color=ACC, ha='center', va='center', rotation=ang,
                bbox=dict(fc=FLOOR, ec='none', pad=0.4), zorder=6)
    # overall exterior dimensions measured on the model
    dim(ax, P((313, 1383)), P((313, 305)), 0.9)                 # west side
    dim(ax, P((313, 1383)), P((1170, 1383)), -0.7)              # entrance side
    dim(ax, P((313, 305)), P((1510, 387)), 2.1)               # balcony facade
    dim(ax, P((1510, 1300)), P((1585, 208)), -0.9)              # south side
    # sockets and switches
    for o in PL['outlets']:
        p = np.array(o['p']); n = np.array(o['n'])
        c = p + n * 0.13
        if o['kind'] == 'switch':
            ax.add_patch(Rectangle((c[0] - 0.07, c[1] - 0.07), 0.14, 0.14, fc='white', ec=ACC, lw=0.9, zorder=7))
            ax.text(c[0], c[1], 'S', fontsize=5.5, color=ACC, ha='center', va='center', weight='bold', zorder=8)
        else:
            ax.add_patch(plt.Circle(c, 0.08, fc='white', ec=ACC, lw=0.9, zorder=7))
            ax.plot([p[0], c[0] - n[0] * 0.08], [p[1], c[1] - n[1] * 0.08], color=ACC, lw=0.9, zorder=7)
            if o['kind'] == 'socket2':
                ax.add_patch(plt.Circle(c, 0.045, fc=ACC, ec='none', zorder=8))
        t = c + n * 0.22
        ax.text(t[0], t[1], f"{o['z']:.2f}", fontsize=5.5, color=ACC, ha='center', va='center', zorder=8)
    # legend
    lx, ly = -2.9, 7.8
    ax.text(lx, ly + 1.7, 'Legend', fontsize=8, weight='bold', color=INK)
    ax.add_patch(plt.Circle((lx + 0.1, ly + 1.25), 0.08, fc='white', ec=ACC, lw=0.9))
    ax.text(lx + 0.35, ly + 1.25, 'socket (height in m)', fontsize=6.5, va='center')
    ax.add_patch(plt.Circle((lx + 0.1, ly + 0.9), 0.08, fc='white', ec=ACC, lw=0.9)); ax.add_patch(plt.Circle((lx + 0.1, ly + 0.9), 0.045, fc=ACC))
    ax.text(lx + 0.35, ly + 0.9, 'double socket', fontsize=6.5, va='center')
    ax.add_patch(Rectangle((lx + 0.03, ly + 0.48), 0.14, 0.14, fc='white', ec=ACC, lw=0.9))
    ax.text(lx + 0.35, ly + 0.55, 'switch', fontsize=6.5, va='center')
    ax.plot([lx, lx + 0.22], [ly + 0.2, ly + 0.2], color=ACC, lw=0.5, ls=(0, (4, 2)))
    ax.text(lx + 0.35, ly + 0.2, 'room size printed on plan', fontsize=6.5, va='center')
    ax.text(lx, ly - 0.25, 'Sockets: only those visible in\nthe photos (living room, kitchen,\nhallway). Bedrooms not surveyed.',
            fontsize=5.8, color=MUTED, va='top')
    # north arrow: plan up = east
    nx, ny = -1.5, 5.2
    ax.annotate('', xy=(nx - 0.6, ny), xytext=(nx + 0.2, ny), arrowprops=dict(arrowstyle='-|>', color=INK, lw=1.2))
    ax.text(nx - 0.85, ny, 'N', fontsize=10, weight='bold', ha='center', va='center')
    ax.text(nx - 0.2, ny + 0.45, 'balcony faces E ↑', fontsize=6, color=MUTED, ha='center')
    # scale bar
    bx, by = 0.0, -2.3
    for i in range(5):
        ax.add_patch(Rectangle((bx + i, by), 1, 0.12, fc=INK if i % 2 == 0 else 'white', ec=INK, lw=0.5))
        ax.text(bx + i, by - 0.2, f'{i}', fontsize=6, ha='center')
    ax.text(bx + 5, by - 0.2, '5 m', fontsize=6, ha='center')
    pdf.savefig(fig)
    fig.savefig('drawings/floor_plan.png', dpi=200)
    plt.close(fig)


# ------------------------------------------------------------------ elevations
OPEN = {o['name']: o for o in G['openings']}


def elevation(ax, x_off, y_off, wall_a, wall_b, names, title, flip, balcony_span=None, note=None, labels_right=False):
    """Unfold the exterior face wall_a->wall_b. flip=True puts wall_b on the left (view from outside)."""
    A, B = P(wall_a), P(wall_b)
    L = np.linalg.norm(B - A); u = (B - A) / L
    X = (lambda t: x_off + (L - t)) if flip else (lambda t: x_off + t)
    z0 = y_off
    # wall body: slab to slab
    ax.add_patch(Rectangle((x_off, z0 - 0.25), L, H + 0.5, fc='#e9e5de', ec=INK, lw=0.8))
    for z, lab in ((0, '±0.00 floor'), (H, f'+{H:.2f} ceiling (est.)')):
        ax.plot([x_off - 0.4, x_off + L + 0.4], [z0 + z, z0 + z], color=MUTED, lw=0.5, ls=(0, (6, 3)))
        if labels_right:
            ax.text(x_off + L + 0.5, z0 + z, lab, fontsize=6, color=MUTED, ha='left', va='center')
        else:
            ax.text(x_off - 0.5, z0 + z, lab, fontsize=6, color=MUTED, ha='right', va='center')
    ax.plot([x_off - 0.4, x_off + L + 0.4], [z0 - 0.25, z0 - 0.25], color=INK, lw=0.4)
    spans = []
    for nm in names:
        o = OPEN[nm]
        q = np.array([P(p) for p in o['q']])
        ts = sorted(float(np.dot(p - A, u)) for p in q)
        t0, t1 = ts[0], ts[-1]
        xa, xb = sorted([X(t0), X(t1)])
        zs, zh = o['sill'], o['head']
        ax.add_patch(Rectangle((xa, z0 + zs), xb - xa, zh - zs, fc='#cfdbe2', ec=INK, lw=0.8))
        n = o.get('panes', 2)
        for k in range(1, n):
            xm = xa + (xb - xa) * k / n
            ax.plot([xm, xm], [z0 + zs, z0 + zh], color=INK, lw=0.8)
        if o['kind'] == 'window':  # french balcony railing
            for xr in np.arange(xa + 0.05, xb, 0.11):
                ax.plot([xr, xr], [z0 + zs, z0 + zs + 1.0], color='#6d7275', lw=0.4)
            ax.plot([xa, xb], [z0 + zs + 1.0, z0 + zs + 1.0], color='#6d7275', lw=1)
        # dims: width above, sill/head at side
        dim(ax, (xa, z0 + H + 0.25), (xb, z0 + H + 0.25), 0.25, f'{xb - xa:.2f}', fs=6.5)
        dim(ax, (xb, z0), (xb, z0 + zs), -0.001 - 0.18, f'{zs:.2f}', fs=5.5, color=ACC) if zs > 0.2 else None
        dim(ax, (xb, z0 + zs), (xb, z0 + zh), -0.18, f'{zh - zs:.2f}', fs=5.5, color=ACC)
        spans.append((xa, xb))
    # chain dimension along the bottom
    pts = [x_off] + [v for s in sorted(spans) for v in s] + [x_off + L]
    for p0, p1 in zip(pts[:-1], pts[1:]):
        if p1 - p0 > 0.05:
            dim(ax, (p0, z0 - 0.25), (p1, z0 - 0.25), -0.35, f'{p1 - p0:.2f}', fs=6)
    dim(ax, (x_off, z0 - 0.25), (x_off + L, z0 - 0.25), -0.85, f'{L:.2f}', fs=7)
    if balcony_span is not None:
        ba, bb = balcony_span
        xa, xb = sorted([X(ba), X(bb)])
        ax.add_patch(Rectangle((xa, z0 - 0.22), xb - xa, 0.2, fc='#bdb7ae', ec=INK, lw=0.7, zorder=5))
        for xr in np.arange(xa + 0.03, xb, 0.11):
            ax.plot([xr, xr], [z0 - 0.02, z0 + 1.1], color='#6d7275', lw=0.5, zorder=5)
        ax.plot([xa, xb], [z0 + 1.1, z0 + 1.1], color='#6d7275', lw=1.1, zorder=5)
        ax.text((xa + xb) / 2, z0 + 1.25, 'balcony railing 1.10 (est.)', fontsize=5.5, color=MUTED, ha='center', zorder=6)
    ax.text(x_off, z0 + H + 1.25, title, fontsize=10, weight='bold', color=INK)
    if note:
        ax.text(x_off, z0 + H + 0.95, note, fontsize=6.5, color=MUTED)


def elevations(pdf):
    fig, ax, mm = sheet('Exterior elevations', 'Balcony façade (east) and north façade, seen from outside', -1.8, -1.5)
    # east facade: plan top wall, from north corner (313,305) to south end (1510,387); seen from the east
    A, B = P((313, 305)), P((1510, 387))
    u = (B - A) / np.linalg.norm(B - A)
    bal = np.array(PL['balcony'])
    tb = [float(np.dot(p - A, u)) for p in bal]
    elevation(ax, 1.2, 7.2, (313, 305), (1510, 387), ['balcony', 'win_vaer', 'win_bed'],
              'East façade · balcony side', flip=True, balcony_span=(min(tb), max(tb)),
              note='Seen from the east. Left = south (bedroom), right = north (living room + balcony).')
    # north facade: plan left wall x=313 from (313,305) east corner to (313,1383) west corner; seen from the north
    A2, B2 = P((313, 305)), P((313, 1383))
    u2 = (B2 - A2) / np.linalg.norm(B2 - A2)
    tb2 = [float(np.dot(p - A2, u2)) for p in bal]
    elevation(ax, 1.2, 1.2, (313, 305), (313, 1383), ['win_w1', 'win_w2'], 'North façade · canal side, living-room windows',
              flip=False, balcony_span=(min(tb2), max(tb2)),
              note='Left = east (balcony end), right = west (kitchen end). Balcony projects towards you on the left.', labels_right=True)
    ax.text(15.0, 1.2 + H + 1.25,
            'Heights are estimates\n\nCeiling 2.60 m, window sills\n0.40 m (living room) and 0.08 m\n'
            '(bedrooms, French balconies)\nand heads 2.35–2.45 m were\nread from the photos, not the\nplan. Widths and lengths are\n'
            'traced from the plan.', fontsize=6.5, color=MUTED, va='top')
    pdf.savefig(fig)
    fig.savefig('drawings/elevations.png', dpi=200)
    plt.close(fig)


import os
os.makedirs('drawings', exist_ok=True)
with PdfPages('drawings/apartment_drawings.pdf') as pdf:
    floor_plan(pdf)
    elevations(pdf)
print('ok')
