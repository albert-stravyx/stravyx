#!/usr/bin/env python3
"""Align the columns of every GitHub-flavoured Markdown table in a file.

Pads each cell with spaces so that the pipe delimiters line up in the raw
source, making tables clean and easy to read. Column alignment markers
(``:---``, ``---:``, ``:---:``) are preserved. Content inside fenced code
blocks (``` or ~~~) is left untouched.

Usage:
    python3 scripts/align_markdown_tables.py <file.md> [<file2.md> ...]
"""
from __future__ import annotations

import sys
from typing import List, Optional, Tuple


def split_row(line: str) -> List[str]:
    """Split a table row into its cell contents (outer pipes stripped)."""
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [cell.strip() for cell in s.split("|")]


def is_separator(cells: List[str]) -> bool:
    """True if every cell looks like a table separator, e.g. :---:."""
    if not cells:
        return False
    for cell in cells:
        c = cell.strip()
        if not c or set(c) - set(":-"):
            return False
        if "-" not in c:
            return False
    return True


def alignment_of(cell: str) -> str:
    """Return 'left', 'right', 'center', or 'none' for a separator cell."""
    c = cell.strip()
    left = c.startswith(":")
    right = c.endswith(":")
    if left and right:
        return "center"
    if right:
        return "right"
    if left:
        return "left"
    return "none"


def build_separator(width: int, align: str) -> str:
    if align == "center":
        return ":" + "-" * max(1, width - 2) + ":"
    if align == "right":
        return "-" * max(1, width - 1) + ":"
    if align == "left":
        return ":" + "-" * max(1, width - 1)
    return "-" * max(3, width)


def pad(text: str, width: int, align: str) -> str:
    gap = width - len(text)
    if gap <= 0:
        return text
    if align == "right":
        return " " * gap + text
    if align == "center":
        left = gap // 2
        return " " * left + text + " " * (gap - left)
    return text + " " * gap


def format_table(rows: List[List[str]], aligns: List[str]) -> List[str]:
    ncols = len(aligns)
    norm = [row + [""] * (ncols - len(row)) for row in rows]
    widths = [3] * ncols
    for row in norm:
        for i in range(ncols):
            widths[i] = max(widths[i], len(row[i]))
    # Separators need at least 3 chars; centred need room for two colons.
    for i, a in enumerate(aligns):
        if a == "center":
            widths[i] = max(widths[i], 5)

    out: List[str] = []
    header, body = norm[0], norm[1:]
    out.append(
        "| " + " | ".join(pad(header[i], widths[i], aligns[i]) for i in range(ncols)) + " |"
    )
    out.append(
        "|" + "|".join(" " + build_separator(widths[i], aligns[i]) + " " for i in range(ncols)) + "|"
    )
    for row in body:
        out.append(
            "| " + " | ".join(pad(row[i], widths[i], aligns[i]) for i in range(ncols)) + " |"
        )
    return out


def align_tables(text: str) -> str:
    lines = text.split("\n")
    out: List[str] = []
    i = 0
    fence: Optional[str] = None
    while i < len(lines):
        line = lines[i]
        stripped = line.lstrip()

        # Track fenced code blocks so their contents are never reformatted.
        if fence is not None:
            out.append(line)
            if stripped.startswith(fence):
                fence = None
            i += 1
            continue
        if stripped.startswith("```") or stripped.startswith("~~~"):
            fence = stripped[:3]
            out.append(line)
            i += 1
            continue

        # A table needs a header row followed by a separator row.
        if line.lstrip().startswith("|") and i + 1 < len(lines):
            sep_cells = split_row(lines[i + 1])
            if lines[i + 1].lstrip().startswith("|") and is_separator(sep_cells):
                header_cells = split_row(line)
                aligns = [alignment_of(c) for c in sep_cells]
                ncols = max(len(header_cells), len(aligns))
                aligns += ["none"] * (ncols - len(aligns))

                rows = [header_cells]
                j = i + 2
                while j < len(lines) and lines[j].lstrip().startswith("|"):
                    rows.append(split_row(lines[j]))
                    j += 1

                out.extend(format_table(rows, aligns))
                i = j
                continue

        out.append(line)
        i += 1

    return "\n".join(out)


def main(argv: List[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 1
    for path in argv[1:]:
        with open(path, "r", encoding="utf-8") as fh:
            original = fh.read()
        updated = align_tables(original)
        if updated != original:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(updated)
            print(f"aligned tables in {path}")
        else:
            print(f"no changes needed in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
