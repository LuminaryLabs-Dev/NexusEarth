#!/usr/bin/env python3
"""Build a polar-safe, cloud-free atlas from already licensed local inputs.

The script intentionally does not download multi-terabyte source collections.
It validates the required GDAL tools and builds a WGS84 Cloud Optimized GeoTIFF
with an explicit priority order. Publish tiles to versioned object storage.
"""
from argparse import ArgumentParser
from pathlib import Path
import shutil
import subprocess

parser = ArgumentParser()
parser.add_argument("--blue-marble", required=True)
parser.add_argument("--sentinel", required=True)
parser.add_argument("--gimp", required=True)
parser.add_argument("--lima", required=True)
parser.add_argument("--moa", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()

for tool in ("gdalbuildvrt", "gdalwarp", "gdal_translate"):
    if not shutil.which(tool):
        raise SystemExit(f"Missing required GDAL command: {tool}")
inputs = [Path(getattr(args, key)) for key in ("blue_marble", "sentinel", "gimp", "lima", "moa")]
for source in inputs:
    if not source.exists():
        raise SystemExit(f"Missing source: {source}")
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
vrt = output.with_suffix(".vrt")
subprocess.run(["gdalbuildvrt", "-resolution", "highest", "-srcnodata", "0 0 0", str(vrt), *map(str, inputs)], check=True)
subprocess.run(["gdalwarp", "-t_srs", "EPSG:4326", "-r", "cubic", "-dstnodata", "0", str(vrt), str(output.with_suffix(".warped.tif"))], check=True)
subprocess.run(["gdal_translate", "-of", "COG", "-co", "COMPRESS=JPEG", "-co", "QUALITY=88", str(output.with_suffix(".warped.tif")), str(output)], check=True)
print(f"Built atlas: {output}")
