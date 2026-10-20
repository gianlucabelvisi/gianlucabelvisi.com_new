cd "$(dirname "$0")/data"
curl -s -m 600 -o w40575_s10.zip https://tinitaly.pi.ingv.it/data_1.1/w40575_s10/w40575_s10.zip
ls -la w40575_s10.zip; unzip -o -q w40575_s10.zip -d tinitaly && ls -la tinitaly
