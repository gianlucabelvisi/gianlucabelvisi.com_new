#!/bin/bash
# Fetch the OpenStreetMap context around Rådmansgatan 1A, Lund, then rebuild site.json.
# Run natively on the Mac (the cloud container and the Cowork VM can't reach the OSM API).
# osm.xml (~0.8 MB) is git-ignored; site.json (the trimmed, local-metre version) is what the viewer inlines.
cd "$(dirname "$0")"
curl -s -m 90 -A 'gianlucabelvisi.com lund-src' -o osm.xml 'https://api.openstreetmap.org/api/0.6/map?bbox=13.1752,55.7012,13.1822,55.7043'
ls -la osm.xml
python3 prep.py osm.xml site.json
