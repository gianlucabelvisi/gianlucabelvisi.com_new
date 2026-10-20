#!/bin/bash
cd "$(dirname "$0")/data"
UA='gianlucabelvisi.com-pantelleria-map/1.0 (personal blog)'
B='36.70,11.88,36.87,12.09'
get() { k=$1; q=$2
  for ep in https://maps.mail.ru/osm/tools/overpass/api/interpreter https://overpass-api.de/api/interpreter https://maps.mail.ru/osm/tools/overpass/api/interpreter https://overpass-api.de/api/interpreter; do
    if [ -s osm_$k.json ] && head -c 300 osm_$k.json | grep -q '"elements"'; then break; fi
    curl -s -m 400 -A "$UA" --data-urlencode "data=[out:json][timeout:300];${q}out geom;" -o osm_$k.json "$ep"
    echo "$k $ep $(wc -c < osm_$k.json)"; sleep 3
  done; }
get roads "way[highway]($B);"
get buildings "nwr[building]($B);"
get land "(nwr[landuse]($B);nwr[natural]($B);nwr[leisure]($B);nwr[water]($B);nwr[waterway]($B);nwr[aeroway]($B);nwr[man_made]($B);nwr[barrier]($B);nwr[amenity=parking]($B););"
get poi "(node[place]($B);nwr[tourism]($B);nwr[historic]($B);nwr[amenity]($B);nwr[harbour]($B);nwr[boundary=protected_area]($B);nwr[sport]($B);nwr[shop]($B););"
echo done
