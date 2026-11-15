"""Hand edits to the height grid: python3 terrain_edits.py   (right after prep.py, before the roads are graded)
Small, named, local changes where the 10 m DEM cannot show what is there. Each edit sets grid nodes to a level.
RULE (Gianluca): whenever the terrain is altered the roads must not be affected -> an edit is refused if a drivable
road edge is within 12 m of any node it moves (the 10 m grid is cubic-interpolated: a node's reach is about a cell).
"""
import json
import numpy as np
EDITS = [
    # Sataria: the sea cave is a hollow under the bank; the DEM shows a plain slope. Floor ~0.8 m above the sea,
    # the bank behind (north, east) stays, so the hollow gets steep rock walls; the viewer puts the lava roof over it.
    # NB the Perimetrale runs right above (y ~ -110), so only the node at the foot of the bank moves; the cave is shallow.
    ('Sataria cave floor', 0.8, [(-3430, -130)]),
]
G = np.load('prep/grid.npz'); Z = G['z'].copy(); X0, Y0, C = float(G['x0']), float(G['y0']), float(G['cell'])
F = json.load(open('prep/features.json'))
drv = [(np.array([p[:2] for p in r['pts']], float), r['w'] / 2) for r in F['roads'] if r['cls'] not in ('steps', 'footway', 'path', 'pedestrian')]
# moles: OSM draws the coastline round them, so the 10 m land mask gives each pier a shelf of rock at +0.4 m; the pier stands in the sea.
# Grid nodes within 12 m of the pier polygon that are at most 1.2 m high go to -1.2 m (the pier prism covers its own footprint).
from shapely.geometry import Polygon as _Poly, Point as _Pt
MOLES = [('Scauri mole', (-2289, -1863)), ('Scauri west mole', (-2464, -1830))]
for name, (mx, my) in MOLES:
    pp = [p for p in F['piers'] if p['closed'] and abs(np.mean([q[0] for q in p['pts']]) - mx) < 15 and abs(np.mean([q[1] for q in p['pts']]) - my) < 15]
    if not pp: print('terrain edit: no pier found for', name); continue
    poly = _Poly(pp[0]['pts']).buffer(0); x0_, y0_, x1_, y1_ = poly.bounds; nodes = []
    for i in range(int((y0_ - 20 - Y0) // C), int((y1_ + 20 - Y0) // C) + 2):
        for j in range(int((x0_ - 20 - X0) // C), int((x1_ + 20 - X0) // C) + 2):
            x, y = X0 + j * C, Y0 + i * C
            if Z[i, j] <= 1.2 and poly.distance(_Pt(x, y)) < 12: nodes.append((x, y))
    EDITS.append((name + ' (sea round it)', -1.2, nodes, 'skip'))   # 'skip': nodes near a road are left out, the rest applied
for name, lvl, nodes, *mode in EDITS:
    bad = [n for n in nodes if any(np.min(np.hypot(P[:, 0] - n[0], P[:, 1] - n[1])) - hw < 12 for P, hw in drv)]
    if bad and mode: nodes = [n for n in nodes if n not in bad]; print('terrain edit:', name, 'left', len(bad), 'nodes near a road alone')
    elif bad: print('terrain edit REFUSED (road within 12 m):', name, bad); continue
    for x, y in nodes:
        Z[int(round((y - Y0) / C)), int(round((x - X0) / C))] = lvl
    print('terrain edit:', name, len(nodes), 'nodes ->', lvl, 'm')
np.savez_compressed('prep/grid.npz', z=Z.astype(np.float32), land=G['land'], x0=X0, y0=Y0, cell=C)
