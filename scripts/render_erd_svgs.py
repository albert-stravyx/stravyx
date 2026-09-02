#!/usr/bin/env python3
"""Render the ERD SVG diagrams (docs/images/*.svg) to high-res PNGs.

The mermaid-exported SVGs draw all their label text via <foreignObject> HTML,
which only a real browser engine renders. We drive headless Google Chrome to
inline each SVG in an HTML wrapper and screenshot it at 2x for crisp output.

Output PNGs land in docs/images/layout-{dagre|elk}/rendered/ for the PDF generator.
"""

from __future__ import annotations

import argparse
import os
import re
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "docs" / "images"


def dirs_for_layout(layout: str) -> tuple[Path, Path]:
  svg_dir = IMAGES / f"layout-{layout}"
  out_dir = svg_dir / "rendered"
  return svg_dir, out_dir

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SCALE = 2  # device pixel ratio for crisp text

VIEWBOX_RE = re.compile(r'viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"')


def svg_dimensions(svg_text):
  m = VIEWBOX_RE.search(svg_text)
  if not m:
    raise ValueError("no viewBox found in SVG")
  _, _, w, h = (float(v) for v in m.groups())
  return int(round(w)), int(round(h))


def render(svg_path: Path, out_path: Path) -> None:
  svg_text = svg_path.read_text(encoding="utf-8")
  width, height = svg_dimensions(svg_text)

  # Force the SVG to fill the wrapper body at its natural pixel size.
  html = (
    "<!doctype html><html><head><meta charset='utf-8'>"
    "<style>html,body{margin:0;padding:0;background:#fff;}"
    f"#wrap{{width:{width}px;}}#wrap svg{{display:block;width:100%;height:auto;max-width:none!important;}}"
    "</style></head><body>"
    f"<div id='wrap'>{svg_text}</div></body></html>"
  )

  with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as fh:
    fh.write(html)
    html_path = Path(fh.name)

  # Chrome writes the screenshot then often lingers, so run it detached, poll
  # for the output file, and kill the process group once the PNG is ready.
  if out_path.exists():
    out_path.unlink()

  proc = subprocess.Popen(
    [
      CHROME,
      "--headless=old",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      f"--user-data-dir={tempfile.mkdtemp(prefix='chrome-erd-')}",
      f"--force-device-scale-factor={SCALE}",
      "--default-background-color=FFFFFFFF",
      f"--window-size={width},{height}",
      f"--screenshot={out_path}",
      html_path.as_uri(),
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    start_new_session=True,
  )

  try:
    deadline = time.time() + 90
    while time.time() < deadline:
      if out_path.exists() and out_path.stat().st_size > 0:
        time.sleep(0.3)  # let the write settle
        break
      time.sleep(0.3)
    else:
      raise RuntimeError(f"timed out rendering {svg_path.name}")
  finally:
    try:
      os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except ProcessLookupError:
      # Chrome already exited on its own; nothing left to reap.
      pass
    html_path.unlink(missing_ok=True)

  print(f"  rendered {out_path.name} ({width}x{height} @ {SCALE}x)")


def main() -> None:
  parser = argparse.ArgumentParser(description="Rasterise ERD SVGs to PNG via headless Chrome.")
  parser.add_argument(
    "--layout",
    choices=("dagre", "elk"),
    default="elk",
    help="Which layout-{name} folder under docs/images/ to render. Default: elk.",
  )
  args = parser.parse_args()
  svg_dir, out_dir = dirs_for_layout(args.layout)
  out_dir.mkdir(parents=True, exist_ok=True)
  svgs = sorted(svg_dir.glob("*.svg"))
  if not svgs:
    sys.exit(f"No SVGs found in {svg_dir}")
  print(f"Rendering {len(svgs)} SVG(s) [{args.layout}] -> {out_dir}")
  for svg in svgs:
    render(svg, out_dir / (svg.stem + ".png"))
  print("Done.")


if __name__ == "__main__":
  main()
