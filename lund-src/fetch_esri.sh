#!/bin/bash
# Esri World Imagery tiles (z20) around the block, for tracing the courtyard. Run natively on the Mac. Output git-ignored (ref/).
cd "$(dirname "$0")/ref/esri"
python3 - <<'PY'
import math, subprocess
z=20; lat0,lon0=55.70276,13.17864
def tile(lat,lon):
    n=2**z; x=(lon+180)/360*n; y=(1-math.log(math.tan(math.radians(lat))+1/math.cos(math.radians(lat)))/math.pi)/2*n; return x,y
x0,y0=tile(lat0+0.00045,lon0-0.0006); x1,y1=tile(lat0-0.00045,lon0+0.0011)
for tx in range(int(x0),int(x1)+1):
    for ty in range(int(y0),int(y1)+1):
        f=f"{z}_{tx}_{ty}.jpg"
        subprocess.run(['curl','-s','-f','-m','30','-A','Mozilla/5.0','-o',f,f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{ty}/{tx}'])
print(int(x0),int(x1),int(y0),int(y1))
PY
ls | wc -l
