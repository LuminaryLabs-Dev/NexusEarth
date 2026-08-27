#!/usr/bin/env python3
"""Normalize global and polar DEMs into a single WGS84 terrain source raster."""
from argparse import ArgumentParser
from pathlib import Path
import shutil
import subprocess

parser = ArgumentParser()
parser.add_argument("--gebco", required=True)
parser.add_argument("--copernicus", required=True)
parser.add_argument("--arcticdem", required=True)
parser.add_argument("--rema", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
for tool in ("gdalbuildvrt", "gdalwarp", "gdal_translate"):
    if not shutil.which(tool):
        raise SystemExit(f"Missing required GDAL command: {tool}")
inputs = [Path(getattr(args, key)) for key in ("gebco", "copernicus", "arcticdem", "rema")]
for source in inputs:
    if not source.exists():
        raise SystemExit(f"Missing source: {source}")
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
vrt = output.with_suffix(".vrt")
subprocess.run(["gdalbuildvrt", "-resolution", "highest", "-srcnodata", "-9999", str(vrt), *map(str, inputs)], check=True)
subprocess.run(["gdalwarp", "-t_srs", "EPSG:4326", "-r", "cubic", "-dstnodata", "-32768", str(vrt), str(output.with_suffix(".warped.tif"))], check=True)
subprocess.run(["gdal_translate", "-of", "COG", "-ot", "Int16", "-co", "COMPRESS=ZSTD", str(output.with_suffix(".warped.tif")), str(output)], check=True)
print(f"Built normalized terrain source: {output}")
print("Next: encode this COG as quantized-mesh or Terrarium tiles in versioned object storage.")
