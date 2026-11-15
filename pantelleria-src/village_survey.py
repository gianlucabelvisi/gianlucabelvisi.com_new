"""Street View survey of village houses: python3 village_survey.py   (after prep.py, before roads_smooth.py)
data/village_survey.json is keyed by building id (prep/features.json): kind house|dammuso, st (storeys, houses),
col (TPAL index: 0 white, 1 cream, 2 ochre, 3 pink, 4 beige, 5 grey), fac (close-up dressing, as in town_survey.json).
Applies kind and height to prep/features.json and writes prep/village_fac.json (id -> col, fac) for web_assets.py.
"""
import json, os
F = json.load(open('prep/features.json'))
SV = json.load(open('data/village_survey.json')) if os.path.exists('data/village_survey.json') else {}
out = {}; n = 0
# "_modelled": OSM footprints that the viewer builds by hand (e.g. the Sese Grande tomb) -> no generic house there
_md = set(SV.get('_modelled', {}).keys()) if isinstance(SV.get('_modelled'), dict) else set()
F['buildings'] = [b for b in F['buildings'] if str(b['id']) not in _md]
for b in F['buildings']:
    o = SV.get(str(b['id']))
    if not isinstance(o, dict): continue
    n += 1
    if o.get('kind') == 'house': b['kind'] = 'town'; b['h'] = round(o.get('st', 1) * 3.1 + 0.6, 2)
    elif o.get('kind') == 'dammuso': b['kind'] = 'dammuso'; b['h'] = 3.6
    elif 'st' in o and b['kind'] == 'town': b['h'] = round(o['st'] * 3.1 + 0.6, 2)
    if 'col' in o or 'fac' in o: out[str(b['id'])] = {k: o[k] for k in ('col', 'fac', 'st') if k in o}
# walk-only lanes (2026-11-13, Scauri first): village lanes that are stairs or too narrow and steep for a car.
# data/village_survey.json "_walk_only": {"steps": [road ids], "footway": [road ids]}. They become narrow paved
# footways / stone steps that follow the ground as it is (roads_smooth.py does not grade footways, so the hillside
# keeps its shape) and the car's road logic ignores them.
_wo = SV.get('_walk_only', {}); nw = 0
for r in F['roads']:
    if r['id'] in _wo.get('steps', []): r['cls'] = 'steps'; r['w'] = 2.0; r['surface'] = 'paved'; nw += 1
    elif r['id'] in _wo.get('footway', []): r['cls'] = 'footway'; r['w'] = 2.0; r['surface'] = 'paved'; nw += 1
print('walk-only lanes', nw)
# steps and footways end at the kerb of a drivable road, not on its centre line
import numpy as _np
_drv = [(_np.array([p[:2] for p in r['pts']], float), r['w'] / 2) for r in F['roads'] if r['cls'] not in ('steps', 'footway', 'path', 'pedestrian')]
_nt = 0
for r in F['roads']:
    if r['cls'] != 'steps' or len(r['pts']) < 3: continue
    for end in (0, -1):
        for _ in range(len(r['pts']) - 2):
            p = r['pts'][end]
            if any(_np.min(_np.hypot(P[:, 0] - p[0], P[:, 1] - p[1])) < hw + 0.8 for P, hw in _drv): r['pts'].pop(end); _nt += 1
            else: break
print('steps trimmed back from carriageways:', _nt, 'points')
json.dump(F, open('prep/features.json', 'w'), separators=(',', ':'))
json.dump(out, open('prep/village_fac.json', 'w'), separators=(',', ':'))
print('village survey: houses applied', n, 'with a look', len(out))
