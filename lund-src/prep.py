"""OSM (osm.xml from the OSM API, see fetch_osm.sh) -> site.json in local metres around Rådmansgatan 1A, Lund.
Frame: x = east, y = north (metres) from 55.70276 N, 13.17864 E. Usage: python3 prep.py [osm.xml] [site.json]"""
import xml.etree.ElementTree as ET, math, json, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else 'osm.xml'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'site.json'
LAT0, LON0, R = 55.70276, 13.17864, 190.0
r = ET.parse(SRC).getroot()
N = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in r.iter('node')}
def xy(ll): return [round((ll[1] - LON0) * 111320 * math.cos(math.radians(LAT0)), 2), round((ll[0] - LAT0) * 110540, 2)]
def area(p): return sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p))) / 2
def near(p, rr=R): return any(math.hypot(*q) < rr for q in p)
out = {'buildings': [], 'roads': [], 'areas': [], 'barriers': [], 'trees': [], 'lamps': []}
WID = {'secondary': 9, 'tertiary': 7.5, 'residential': 6, 'unclassified': 6, 'service': 4, 'living_street': 5, 'pedestrian': 4,
       'footway': 2.2, 'cycleway': 2.4, 'path': 1.6, 'platform': 2.5, 'steps': 2}
for w in r.iter('way'):
    t = {k.get('k'): k.get('v') for k in w.iter('tag')}
    refs = [nd.get('ref') for nd in w.iter('nd')]
    if any(x not in N for x in refs): continue
    p = [xy(N[x]) for x in refs]
    if not near(p): continue
    closed = refs[0] == refs[-1]
    if 'building' in t and closed:
        q = p[:-1]
        if area(q) < 0: q = q[::-1]
        lv = t.get('building:levels')
        out['buildings'].append({'id': w.get('id'), 'p': q, 'b': t['building'], 'lv': float(lv) if lv else None,
                                 'addr': (t.get('addr:street', '') + ' ' + t.get('addr:housenumber', '')).strip(), 'roof': t.get('roof:shape')})
    elif 'highway' in t and t['highway'] in WID:
        if t.get('area') == 'yes' and closed: out['areas'].append({'k': 'pave', 'p': p[:-1]}); continue
        out['roads'].append({'c': t['highway'], 'n': t.get('name', ''), 'w': WID[t['highway']], 'p': p, 'fw': t.get('footway', '')})
    elif closed and ('landuse' in t or 'leisure' in t or t.get('amenity') == 'parking' or 'natural' in t or 'surface' in t or 'area:highway' in t):
        k = t.get('leisure') or t.get('landuse') or t.get('natural') or ('parking' if t.get('amenity') == 'parking' else None) or t.get('area:highway') or t.get('surface')
        q = p[:-1]
        if area(q) < 0: q = q[::-1]
        out['areas'].append({'k': k, 'p': q})
    elif 'barrier' in t:
        out['barriers'].append({'k': t['barrier'], 'p': p})
for n in r.iter('node'):
    t = {k.get('k'): k.get('v') for k in n.iter('tag')}
    if not t: continue
    q = xy(N[n.get('id')])
    if math.hypot(*q) > R: continue
    if t.get('natural') == 'tree': out['trees'].append(q)
    if t.get('highway') == 'street_lamp': out['lamps'].append(q)
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print({k: len(v) for k, v in out.items()}, 'bytes', len(json.dumps(out, separators=(',', ':'))))
