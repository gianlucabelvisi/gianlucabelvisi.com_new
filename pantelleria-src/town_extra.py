"""Buildings OSM misses in Pantelleria town, hand-traced on Esri World Imagery z18 (10 m grid crops, local frame):
python3 town_extra.py   (writes data/extra_town.json; prep.py reads it on its next run)
An automatic roof detector was tried first (light, unsaturated, compact regions not on roads/buildings), but in the
dense town it mostly returned slivers of mapped roofs, paving and parked cars, so these are traced by eye instead.
Each entry: footprint (x, y metres), storeys. prep.py drops any OSM building whose centroid falls inside one of these
(where a traced roof replaces a smaller mapped part of it).
"""
import json

def rect(x0, y0, x1, y1): return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

HAND = [
    # Conad City / Via Felice Cavallotti
    (rect(-4185, 5034, -4173.5, 5055), 2),       # strip on the east side of Cavallotti, north of Conad
    (rect(-4196, 5022, -4190, 5036), 3),
    (rect(-4201, 4986, -4189, 4999.5), 2),
    (rect(-4155, 4972, -4137, 4994), 2),         # the house cluster on the east edge of the field
    (rect(-4176, 4937.5, -4161, 4950), 2),
    (rect(-4185, 4929, -4178, 4934.5), 1),       # tiled-roof annex
    (rect(-4209, 4911.5, -4200, 4919.5), 2),
    (rect(-4215, 4902.5, -4209, 4910), 2),
    (rect(-4167, 4911, -4160, 4919.5), 1),
    (rect(-4147.5, 4961, -4141.5, 4969.5), 2),
    (rect(-4161, 4887, -4154, 4895), 2),
    # Emporio del Gusto / Via Napoli / Via Genova
    ([[-4438.5, 5025.0], [-4427.0, 5032.9], [-4402.5, 5009.3], [-4413.8, 5002.0]], 3),   # terracotta-roofed block
    (rect(-4493, 5001, -4482, 5018), 2),
    (rect(-4499.5, 5099.5, -4484, 5107.5), 1),
    (rect(-4491.5, 5090.5, -4482.5, 5098.5), 2),
    # around Gelateria Katia
    (rect(-4198.5, 5090.5, -4190.5, 5100.5), 2),
    (rect(-4194, 5133.5, -4180.5, 5146.5), 3),
    (rect(-4173.5, 5116.5, -4167.5, 5121.5), 1),
    (rect(-4239.5, 5070.5, -4230.5, 5082.5), 2),
    # behind the castle
    (rect(-4118, 5102.5, -4111, 5110.5), 1),
    (rect(-4092, 5121, -4080, 5142), 3),
]
out = [{'pts': p, 'st': st} for p, st in HAND]
json.dump(out, open('data/extra_town.json', 'w'))
print('hand-traced town buildings', len(out))
