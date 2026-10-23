#!/bin/bash
# Pantelleria town centre: everything OSM has (for landmarks, POIs, street names) -> data/osm_town.json
cd "$(dirname "$0")/data"
UA='gianlucabelvisi.com-pantelleria-map/1.0 (personal blog)'
B='36.8220,11.9300,36.8400,11.9560'
Q="[out:json][timeout:120];(nwr($B););out geom;"
for ep in $(for i in 1 2 3 4 5 6; do echo https://overpass-api.de/api/interpreter https://maps.mail.ru/osm/tools/overpass/api/interpreter; done); do
  curl -s -m 150 -A "$UA" --data-urlencode "data=$Q" -o osm_town.json "$ep"
  head -c 300 osm_town.json | grep -q '"elements"' && break; sleep 30
done
wc -c osm_town.json
