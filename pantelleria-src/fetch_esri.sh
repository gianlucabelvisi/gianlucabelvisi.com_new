#!/bin/bash
# Esri World Imagery z18 tiles over the island (data/esri_tiles.txt) -> data/esri/18_x_y.jpg
# Used only to spot houses missing from OSM (Esri imagery is approved for OSM tracing). Run natively on the Mac.
cd "$(dirname "$0")/data"; mkdir -p esri
fetch() { f=esri/18_$1_$2.jpg; [ -s $f ] || curl -s -m 30 -A "Mozilla/5.0" -o $f "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/$2/$1"; }
export -f fetch
cat esri_tiles.txt | xargs -P 8 -n 2 bash -c 'fetch "$0" "$1"'
ls esri | wc -l
