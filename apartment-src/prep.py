from PIL import Image
import numpy as np, cv2, json

im = np.array(Image.open('plan.png').convert('RGB')).astype(int)
wall = (abs(im - [99, 108, 94]).sum(2) < 60).astype(np.uint8) * 255
wall = cv2.morphologyEx(wall, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
# remove kitchen dash line / window frame slivers
wall[1245:1262, 600:790] = 0
wall[540:1150, 300:312] = 0
# walk-in shower: no door, the thin partition line becomes an opening (a fixed glass screen is added in Blender)
wall[1062:1176, 1383:1405] = 0

cs, h = cv2.findContours(wall, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
h = h[0]
walls = []
for i, c in enumerate(cs):
    if h[i][3] != -1 or cv2.contourArea(c) < 60:
        continue
    rings = [cv2.approxPolyDP(c, 1.0, True)[:, 0].tolist()]
    j = h[i][2]
    while j != -1:
        if cv2.contourArea(cs[j]) > 20:
            rings.append(cv2.approxPolyDP(cs[j], 1.0, True)[:, 0].tolist())
        j = h[j][0]
    walls.append(rings)

# openings: quad in px, type, sill, head
O = [
    dict(name='balcony', q=[(412, 311), (800, 339), (800, 396), (412, 368)], kind='balcony', sill=0.0, head=2.45, panes=3),
    dict(name='win_vaer', q=[(926, 347), (1110, 361), (1110, 418), (926, 404)], kind='window', sill=0.08, head=2.4, panes=2),
    dict(name='win_bed', q=[(1227, 368), (1411, 382), (1411, 438), (1227, 424)], kind='window', sill=0.08, head=2.4, panes=2),
    dict(name='win_w1', q=[(312, 548), (370, 548), (370, 733), (312, 733)], kind='window', sill=0.40, head=2.35, panes=2),
    dict(name='win_w2', q=[(312, 956), (370, 956), (370, 1141), (312, 1141)], kind='window', sill=0.40, head=2.35, panes=2),
    dict(name='door_entry', q=[(967, 1326), (1093, 1326), (1093, 1384), (967, 1384)], kind='door', sill=0, head=2.1),
    dict(name='door_vaer', q=[(1054, 839), (1167, 849), (1167, 860), (1054, 850)], kind='door', sill=0, head=2.1),
    dict(name='door_bed', q=[(1173, 871), (1188, 871), (1181, 988), (1166, 988)], kind='door', sill=0, head=2.1),
    dict(name='door_bath', q=[(1159, 1124), (1172, 1124), (1167, 1240), (1154, 1240)], kind='door', sill=0, head=2.1),
    dict(name='door_tek1', q=[(944, 1112), (958, 1112), (958, 1194), (944, 1194)], kind='door', sill=0, head=2.1),
    dict(name='door_tek2', q=[(944, 1209), (958, 1209), (958, 1289), (944, 1289)], kind='door', sill=0, head=2.1),
]

# floor: flood-fill outside of walls + openings
m = wall.copy()
for o in O:
    cv2.fillPoly(m, [np.array(o['q'], np.int32)], 255)
ff = m.copy()
mask = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8)
cv2.floodFill(ff, mask, (5, 5), 128)
inside = ((ff != 128)).astype(np.uint8) * 255
inside = cv2.morphologyEx(inside, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
fc, _ = cv2.findContours(inside, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
fc = max(fc, key=cv2.contourArea)
floor = cv2.approxPolyDP(fc, 1.5, True)[:, 0].tolist()

json.dump(dict(walls=walls, openings=O, floor=floor), open('geom.json', 'w'))
vis = cv2.cvtColor(inside // 3 + 150, cv2.COLOR_GRAY2BGR)
for rings in walls:
    for r in rings:
        cv2.polylines(vis, [np.array(r)], True, (0, 0, 255), 2)
for o in O:
    cv2.polylines(vis, [np.array(o['q'])], True, (255, 0, 0), 2)
cv2.polylines(vis, [np.array(floor)], True, (0, 160, 0), 1)
cv2.imwrite('geomcheck.png', vis)
print(len(walls), len(floor))
