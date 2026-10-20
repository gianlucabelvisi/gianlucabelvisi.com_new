#!/bin/bash
# Place names + attractions only (the big POI query times out on busy Overpass servers)
cd "$(dirname "$0")/data"
UA='gianlucabelvisi.com-pantelleria-map/1.0 (personal blog)'
B='36.70,11.88,36.87,12.09'
Q="[out:json][timeout:90];(node[place]($B);nwr[tourism~\"attraction|viewpoint\"]($B);nwr[historic][name]($B);nwr[natural=hot_spring]($B);node[amenity=place_of_worship][name]($B););out center;"
for ep in https://overpass-api.de/api/interpreter https://maps.mail.ru/osm/tools/overpass/api/interpreter https://overpass-api.de/api/interpreter; do
  curl -s -m 120 -A "$UA" --data-urlencode "data=$Q" -o osm_poi.json "$ep"
  head -c 300 osm_poi.json | grep -q '"elements"' && break; sleep 5
done
wc -c osm_poi.json
