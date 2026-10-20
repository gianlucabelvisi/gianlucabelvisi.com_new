cd "$(dirname "$0")/data"; mkdir -p s2
for x in $(seq 17467 17483); do for y in $(seq 12770 12787); do
 f=s2/15_${x}_${y}.jpg; [ -s $f ] || curl -s -m 30 -A 'gianlucabelvisi-map/1.0' -o $f "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/15/${y}/${x}.jpg"
done; done; ls s2 | wc -l
