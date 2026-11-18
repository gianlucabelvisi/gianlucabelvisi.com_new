#!/bin/bash
# Render every Blender viewpoint and copy web-sized JPGs into the blog walkthrough.
# Usage: ./render_and_publish.sh [samples] [views]   e.g.  ./render_and_publish.sh 256 all
set -e
cd "$(dirname "$0")"
SAMPLES=${1:-256}
VIEWS=${2:-all}
BLOG_MEDIA="../public/walkthrough/media"   # this script lives in new_blog/apartment-src; renders/ and the .blend stay out of git
/Applications/Blender.app/Contents/MacOS/Blender -b --python build.py -- geom.json renders "$SAMPLES" 100 "$VIEWS" > render_log.txt 2>&1
mkdir -p "$BLOG_MEDIA"
for f in renders/render_*.png; do
  name=$(basename "$f" .png)
  sips -s format jpeg -s formatOptions 82 -Z 1600 "$f" --out "$BLOG_MEDIA/$name.jpg" >/dev/null
  sips -s format jpeg -s formatOptions 78 -Z 360 "$f" --out "$BLOG_MEDIA/${name}_t.jpg" >/dev/null
done
echo "done $(date)" >> render_log.txt
