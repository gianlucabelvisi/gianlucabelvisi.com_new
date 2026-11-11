#!/bin/bash
# full rebuild of the Pantelleria map assets (see README for what each step does)
set -e
cd "$(dirname "$0")"
python3 town_extra.py
python3 prep.py > /tmp/prep.log 2>&1
python3 roads_smooth.py
python3 town.py
python3 sites/airport.py
python3 sites/cliffs.py
python3 coast_atlas.py
python3 sites/bue_marino.py
python3 sites/lago.py
python3 sites/campobello.py
python3 road_clear.py
python3 coast_sea.py
python3 coast_overlay.py
python3 ground_fix.py
python3 build.py > /tmp/build.log 2>&1
python3 web_assets.py
python3 assemble.py web
python3 check_roads.py
node tests/road_check.mjs
