"""Shared PDF helpers for Stravyx board documents."""

from typing import List, Optional, Tuple

from fpdf import FPDF
from fpdf.enums import XPos, YPos
from PIL import Image

MARGIN = 18
PAGE_W = 210 - 2 * MARGIN  # 174mm usable width


def ascii_safe(text: str) -> str:
  replacements = {
    "\u2014": " - ",
    "\u2013": "-",
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2022": "*",
    "\u00b7": "*",
    "\u2026": "...",
    "\u2192": "->",
    "\u2265": ">=",
    "\u2264": "<=",
  }
  for src, dst in replacements.items():
    text = text.replace(src, dst)
  return text.encode("latin-1", errors="replace").decode("latin-1")


class StravyxPDF(FPDF):
  def __init__(self, header_label: str = "Stravyx - Executive Summary - Confidential"):
    super().__init__(orientation="P", unit="mm", format="A4")
    self._header_label = header_label
    self.set_auto_page_break(auto=True, margin=20)
    self.set_margins(MARGIN, MARGIN, MARGIN)

  def header(self):
    if self.page_no() == 1:
      return
    self.set_font("Helvetica", "I", 8)
    self.set_text_color(100, 100, 100)
    self.cell(0, 5, ascii_safe(self._header_label), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

  def footer(self):
    self.set_y(-12)
    self.set_font("Helvetica", "I", 8)
    self.set_text_color(120, 120, 120)
    self.cell(0, 5, f"Page {self.page_no()}", align="C")

  def ensure_space(self, needed_mm: float = 30):
    if self.get_y() + needed_mm > 275:
      self.add_page()

  def cover_block(self, doc_title: str, doc_subtitle: str, meta: str = "May 2026  |  CONFIDENTIAL"):
    self.set_font("Helvetica", "B", 22)
    self.set_text_color(20, 40, 80)
    self.cell(0, 10, "STRAVYX", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    self.set_font("Helvetica", "", 12)
    self.set_text_color(50, 50, 50)
    self.cell(0, 6, "Australia's On-Demand Drone Services Network", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    self.set_font("Helvetica", "B", 14)
    self.cell(0, 8, ascii_safe(doc_title), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    self.set_font("Helvetica", "", 10)
    self.set_text_color(80, 80, 80)
    self.cell(0, 5, ascii_safe(doc_subtitle), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    self.set_font("Helvetica", "", 9)
    self.cell(0, 5, ascii_safe(meta), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    self.ln(6)
    self.set_draw_color(20, 40, 80)
    self.line(MARGIN, self.get_y(), 210 - MARGIN, self.get_y())
    self.ln(8)

  def section(self, title: str):
    self.ensure_space(25)
    self.ln(3)
    self.set_font("Helvetica", "B", 11)
    self.set_text_color(20, 40, 80)
    self.cell(0, 6, ascii_safe(title), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    self.set_text_color(35, 35, 35)
    self.ln(1)

  def subsection(self, title: str):
    self.ensure_space(15)
    self.ln(2)
    self.set_font("Helvetica", "B", 9.5)
    self.set_text_color(40, 40, 40)
    self.cell(0, 5, ascii_safe(title), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    self.ln(0.5)

  def paragraph(self, text: str, size: float = 9, leading: float = 4.5):
    self.set_font("Helvetica", "", size)
    self.multi_cell(PAGE_W, leading, ascii_safe(text))
    self.ln(2)

  def bullets(self, items: List[str], size: float = 9, leading: float = 4.5):
    self.set_font("Helvetica", "", size)
    for item in items:
      self.ensure_space(12)
      self.multi_cell(PAGE_W, leading, ascii_safe(f"  -  {item}"))
      self.ln(1)

  def numbered(self, items: List[str], size: float = 9, leading: float = 4.5):
    self.set_font("Helvetica", "", size)
    for i, item in enumerate(items, 1):
      self.ensure_space(12)
      self.multi_cell(PAGE_W, leading, ascii_safe(f"  {i}.  {item}"))
      self.ln(1)

  def diagram(
    self,
    image_path: str,
    caption: Optional[str] = None,
    max_width: float = PAGE_W,
    max_height: float = 232,
  ):
    """Embed a diagram image, fit to page width/height, centred, with caption."""
    with Image.open(image_path) as img:
      px_w, px_h = img.size
    aspect = px_h / px_w

    draw_w = max_width
    draw_h = draw_w * aspect
    if draw_h > max_height:
      draw_h = max_height
      draw_w = draw_h / aspect

    caption_h = 5 if caption else 0
    needed = draw_h + caption_h + 4

    # Give the diagram its own clean space; new page if it won't fit here.
    if self.get_y() + needed > 275:
      self.add_page()

    self.ln(1)
    x = MARGIN + (PAGE_W - draw_w) / 2
    self.image(image_path, x=x, y=self.get_y(), w=draw_w, h=draw_h)
    self.set_y(self.get_y() + draw_h)

    if caption:
      self.ln(1)
      self.set_font("Helvetica", "I", 7.5)
      self.set_text_color(110, 110, 110)
      self.cell(0, 4, ascii_safe(caption), new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
      self.set_text_color(35, 35, 35)
    self.ln(3)

  def code_block(self, code: str, size: float = 7, line_h: float = 3.4):
    self.ensure_space(16)
    self.ln(1)
    lines = code.replace("\t", "  ").split("\n")
    self.set_font("Courier", "", size)
    self.set_fill_color(244, 246, 250)
    self.set_text_color(30, 30, 40)
    for line in lines:
      self.ensure_space(10)
      safe = ascii_safe(line)
      while len(safe) > 108:
        self.cell(PAGE_W, line_h, safe[:108], new_x=XPos.LMARGIN, new_y=YPos.NEXT, fill=True)
        safe = "  " + safe[108:]
      self.cell(PAGE_W, line_h, safe, new_x=XPos.LMARGIN, new_y=YPos.NEXT, fill=True)
    self.set_text_color(35, 35, 35)
    self.ln(2)

  def _wrap_cell_lines(self, text: str, width: float, line_h: float) -> List[str]:
    self.set_font("Helvetica", "", 8)
    return self.multi_cell(width, line_h, ascii_safe(text), dry_run=True, output="LINES")

  def table_rows(
    self,
    headers: List[str],
    rows: List[List[str]],
    col_widths: List[float],
    font_size: float = 8,
    line_h: float = 4,
    header_font_size: float = 8,
  ):
    if abs(sum(col_widths) - PAGE_W) > 1:
      raise ValueError(f"Column widths must sum to {PAGE_W}mm, got {sum(col_widths)}")

    x0 = MARGIN

    def draw_row(cells: List[str], bold: bool = False, fill: bool = False):
      self.ensure_space(20)
      y0 = self.get_y()
      style = "B" if bold else ""
      self.set_font("Helvetica", style, font_size if not bold else header_font_size)

      wrapped: List[List[str]] = []
      max_lines = 1
      for cell, w in zip(cells, col_widths):
        lines = self._wrap_cell_lines(cell, w - 2, line_h)
        wrapped.append(lines)
        max_lines = max(max_lines, len(lines))

      row_h = max_lines * line_h + 2

      if y0 + row_h > 275:
        self.add_page()
        y0 = self.get_y()

      for i, w in enumerate(col_widths):
        cx = x0 + sum(col_widths[:i])
        if fill:
          self.set_fill_color(235, 240, 248)
          self.rect(cx, y0, w, row_h, style="DF")
        else:
          self.rect(cx, y0, w, row_h, style="D")

      self.set_font("Helvetica", style, font_size if not bold else header_font_size)
      self.set_text_color(35, 35, 35)
      for line_i in range(max_lines):
        for col_i, w in enumerate(col_widths):
          cx = x0 + sum(col_widths[:col_i])
          line_text = wrapped[col_i][line_i] if line_i < len(wrapped[col_i]) else ""
          self.set_xy(cx + 1, y0 + 1 + line_i * line_h)
          self.cell(w - 2, line_h, line_text)

      self.set_xy(x0, y0 + row_h)

    self.set_font("Helvetica", "B", header_font_size)
    self.set_text_color(20, 40, 80)
    draw_row(headers, bold=True, fill=True)
    self.set_text_color(35, 35, 35)
    self.set_font("Helvetica", "", font_size)

    for row in rows:
      draw_row(row, bold=False, fill=False)

    self.ln(3)

  def tech_stack_table(self, rows: List[Tuple[str, str, str]]):
    self.ensure_space(30)
    self.subsection("Technology choices")
    w_layer = 28
    w_tech = 48
    w_rat = PAGE_W - w_layer - w_tech
    self.table_rows(
      ["Layer", "Technology", "Rationale"],
      [[a, b, c] for a, b, c in rows],
      [w_layer, w_tech, w_rat],
      font_size=7.5,
      line_h=3.8,
      header_font_size=8,
    )
