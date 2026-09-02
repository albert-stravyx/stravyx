#!/usr/bin/env python3
"""Extract the Mermaid diagrams from docs/data-model-erd.md and render them to
SVGs under docs/images/, named after each diagram's section heading.

Pipeline: this script (markdown -> SVG via mermaid-cli) then
scripts/render_erd_svgs.py (SVG -> PNG via headless Chrome) then
scripts/generate_data_model_erd_pdf.py (PNG -> PDF).

mermaid-cli (mmdc) is expected at node_modules/.bin/mmdc and is pointed at the
system Google Chrome via scripts/mmdc-puppeteer.json (no bundled Chromium).
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "data-model-erd.md"
MMDC = ROOT / "node_modules" / ".bin" / "mmdc"
PUPPETEER_CFG = ROOT / "scripts" / "mmdc-puppeteer.json"
SCRIPTS = ROOT / "scripts"

LAYOUTS = {
  "dagre": SCRIPTS / "mmdc-config-dagre.json",
  "elk": SCRIPTS / "mmdc-config-elk.json",
}

HEADING_RE = re.compile(r"^##\s+\d+[a-z]?\.\s+(.*?)\s*$")
FENCE_OPEN_RE = re.compile(r"^```mermaid\s*$")
FENCE_CLOSE_RE = re.compile(r"^```\s*$")

# Mermaid's "neo" look assigns each ER entity one of 12 palette colours
# (data-color-id="color-0..11"). mermaid.live emits these automatically, but the
# stable mermaid-cli (11.16) applies look=neo without per-entity ER colouring, so
# we reproduce it here: (fill, stroke) per colour-id, matching the v0.1 exports.
NEO_PALETTE = [
  ("#FDF4FF", "#E879F9"),  # 0  fuchsia
  ("#F0FDFA", "#2DD4BF"),  # 1  teal
  ("#FFF7ED", "#FB923C"),  # 2  orange
  ("#ECFEFF", "#22D3EE"),  # 3  cyan
  ("#F0FDF4", "#4ADE80"),  # 4  green
  ("#F5F3FF", "#A78BFA"),  # 5  violet
  ("#FEF2F2", "#F87171"),  # 6  red
  ("#FEFCE8", "#FACC15"),  # 7  yellow
  ("#EEF2FF", "#818CF8"),  # 8  indigo
  ("#F7FEE7", "#A3E635"),  # 9  lime
  ("#F0F9FF", "#38BDF8"),  # 10 sky
  ("#FFF1F2", "#FB7185"),  # 11 rose
]
ENTITY_TEXT_COLOR = "#28253D"

SVG_ID_RE = re.compile(r"<svg[^>]*\bid=\"([^\"]+)\"")
# Entity <g> opening tag: class node..., id ...entity-NAME-<index>, data-look="neo"
ENTITY_TAG_RE = re.compile(
  r'(<g class="node[^"]*" id="[^"]*entity-[^"]*-(\d+)" data-look="neo")'
)


def apply_neo_palette(svg_path: Path) -> None:
  """Post-process an mmdc SVG so each ER entity takes a distinct neo palette
  colour (matching the v0.1 mermaid.live exports)."""
  text = svg_path.read_text(encoding="utf-8")
  id_m = SVG_ID_RE.search(text)
  if not id_m:
    return
  root = id_m.group(1)

  colored = {}

  def tag_sub(m):
    idx = int(m.group(2)) % len(NEO_PALETTE)
    colored[idx] = True
    return f'{m.group(1)} data-color-id="color-{idx}"'

  new_text, n = ENTITY_TAG_RE.subn(tag_sub, text)
  if n == 0:
    return  # not an entity diagram (e.g. sequence) — leave untouched

  rules = []
  for i in colored:
    fill, stroke = NEO_PALETTE[i]
    sel = f'#{root} [data-look="neo"][data-color-id="color-{i}"].node'
    rules.append(f"{sel} path,{sel} rect{{stroke:{stroke};fill:{fill};}}")
  rules.append(f"#{root} .er.entityLabel,#{root} .nodeLabel{{fill:{ENTITY_TEXT_COLOR};}}")
  injection = "".join(rules)

  new_text = new_text.replace("</style>", injection + "</style>", 1)
  svg_path.write_text(new_text, encoding="utf-8")


def sanitize(title: str) -> str:
  """Turn a section heading into a filesystem-safe diagram name that matches
  the existing docs/images naming (em dash -> ' - ', slashes stripped)."""
  name = title.replace("\u2014", "-").replace("\u2013", "-")
  name = name.replace("/", "-")
  name = re.sub(r"\s+", " ", name).strip()
  return name


def extract() -> list[tuple[str, str]]:
  """Return [(diagram_name, mermaid_source), ...] in document order."""
  diagrams: list[tuple[str, str]] = []
  current_heading = None
  in_block = False
  buf: list[str] = []

  for line in DOC.read_text(encoding="utf-8").splitlines():
    h = HEADING_RE.match(line)
    if h and not in_block:
      current_heading = sanitize(h.group(1))
      continue
    if not in_block and FENCE_OPEN_RE.match(line):
      in_block = True
      buf = []
      continue
    if in_block and FENCE_CLOSE_RE.match(line):
      in_block = False
      if current_heading and buf:
        diagrams.append((current_heading, "\n".join(buf) + "\n"))
      continue
    if in_block:
      buf.append(line)
  return diagrams


def render(name: str, source: str, svg_dir: Path, mermaid_cfg: Path) -> bool:
  out = svg_dir / f"{name}.svg"
  with tempfile.NamedTemporaryFile("w", suffix=".mmd", delete=False, encoding="utf-8") as fh:
    fh.write(source)
    mmd_path = Path(fh.name)
  try:
    result = subprocess.run(
      [
        str(MMDC),
        "-i", str(mmd_path),
        "-o", str(out),
        "-c", str(mermaid_cfg),
        "-p", str(PUPPETEER_CFG),
        "-b", "white",
      ],
      stdout=subprocess.PIPE,
      stderr=subprocess.STDOUT,
      text=True,
    )
    if result.returncode != 0:
      print(f"  FAILED {out.name}")
      print("    " + (result.stdout or "").strip().replace("\n", "\n    ")[:800])
      return False
    apply_neo_palette(out)
    print(f"  rendered {out.name}")
    return True
  finally:
    mmd_path.unlink(missing_ok=True)


def layout_dirs(layout: str) -> tuple[Path, Path]:
  """SVG + PNG directories for a layout variant (dagre | elk)."""
  svg = ROOT / "docs" / "images" / f"layout-{layout}"
  png = svg / "rendered"
  return svg, png


def main() -> None:
  parser = argparse.ArgumentParser(description="Render ERD mermaid blocks to SVG.")
  parser.add_argument(
    "filter",
    nargs="?",
    help="Optional substring filter — only diagrams whose name contains this (case-insensitive).",
  )
  parser.add_argument(
    "--layout",
    choices=sorted(LAYOUTS),
    default="elk",
    help="Diagram layout engine: dagre (default mermaid, pre-ELK) or elk (compact grid). Default: elk.",
  )
  args = parser.parse_args()

  if not MMDC.exists():
    sys.exit("mmdc not found. Run: PUPPETEER_SKIP_DOWNLOAD=true npm install --no-save @mermaid-js/mermaid-cli")
  svg_dir, _ = layout_dirs(args.layout)
  svg_dir.mkdir(parents=True, exist_ok=True)
  mermaid_cfg = LAYOUTS[args.layout]
  diagrams = extract()
  if not diagrams:
    sys.exit("No mermaid diagrams found in docs/data-model-erd.md")
  print(f"Rendering {len(diagrams)} diagram(s) [{args.layout}] -> {svg_dir}")
  failures = []
  for name, source in diagrams:
    if args.filter and args.filter.lower() not in name.lower():
      continue
    if not render(name, source, svg_dir, mermaid_cfg):
      failures.append(name)
  if failures:
    print(f"Done with {len(failures)} failure(s): {failures}")
    sys.exit(1)
  print("Done.")


if __name__ == "__main__":
  main()
