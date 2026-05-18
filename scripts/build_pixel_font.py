#!/usr/bin/env python3
"""
Converts the Communiculture pixel font SVG glyph sheet into TTF + WOFF2.

Character order in the SVG (left to right):
  ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?:.,

Caps and lowercase share the same glyphs.
"""

import re
import sys
import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

# ── SVG data ──────────────────────────────────────────────────────────────────
SVG = """<svg width="359" height="12" viewBox="0 0 359 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="2" height="10" fill="black"/>
<rect width="2" height="10" fill="black"/>
<rect x="5" width="2" height="10" fill="black"/>
<rect x="5" width="2" height="10" fill="black"/>
<rect width="7" height="2" fill="black"/>
<rect width="7" height="2" fill="black"/>
<rect y="4" width="7" height="2" fill="black"/>
<rect y="4" width="7" height="2" fill="black"/>
<rect x="9" width="2" height="10" fill="black"/>
<rect x="9" width="2" height="10" fill="black"/>
<rect x="13" width="2" height="6" fill="black"/>
<rect x="13" width="2" height="6" fill="black"/>
<rect x="14" y="4" width="2" height="6" fill="black"/>
<rect x="14" y="4" width="2" height="6" fill="black"/>
<rect x="9" width="5" height="2" fill="black"/>
<rect x="9" width="5" height="2" fill="black"/>
<rect x="9" y="4" width="7" height="2" fill="black"/>
<rect x="9" y="4" width="7" height="2" fill="black"/>
<rect x="9" y="8" width="7" height="2" fill="black"/>
<rect x="9" y="8" width="7" height="2" fill="black"/>
<rect x="18" y="2" width="2" height="6" fill="black"/>
<rect x="18" y="2" width="2" height="6" fill="black"/>
<rect x="20" width="5" height="2" fill="black"/>
<rect x="20" width="5" height="2" fill="black"/>
<rect x="20" y="8" width="5" height="2" fill="black"/>
<rect x="20" y="8" width="5" height="2" fill="black"/>
<rect x="27" width="2" height="10" fill="black"/>
<rect x="27" width="2" height="10" fill="black"/>
<rect x="33" y="2" width="2" height="6" fill="black"/>
<rect x="33" y="2" width="2" height="6" fill="black"/>
<rect x="27" width="6" height="2" fill="black"/>
<rect x="27" width="6" height="2" fill="black"/>
<rect x="27" y="8" width="6" height="2" fill="black"/>
<rect x="27" y="8" width="6" height="2" fill="black"/>
<rect x="37" width="2" height="10" fill="black"/>
<rect x="37" width="2" height="10" fill="black"/>
<rect x="37" width="7" height="2" fill="black"/>
<rect x="37" width="7" height="2" fill="black"/>
<rect x="37" y="4" width="7" height="2" fill="black"/>
<rect x="37" y="4" width="7" height="2" fill="black"/>
<rect x="37" y="8" width="7" height="2" fill="black"/>
<rect x="37" y="8" width="7" height="2" fill="black"/>
<rect x="46" width="2" height="10" fill="black"/>
<rect x="46" width="2" height="10" fill="black"/>
<rect x="46" width="7" height="2" fill="black"/>
<rect x="46" width="7" height="2" fill="black"/>
<rect x="46" y="4" width="7" height="2" fill="black"/>
<rect x="46" y="4" width="7" height="2" fill="black"/>
<rect x="60" y="6" width="2" height="4" fill="black"/>
<rect x="60" y="6" width="2" height="4" fill="black"/>
<rect x="55" y="2" width="2" height="6" fill="black"/>
<rect x="55" y="2" width="2" height="6" fill="black"/>
<rect x="57" width="5" height="2" fill="black"/>
<rect x="57" width="5" height="2" fill="black"/>
<rect x="57" y="8" width="5" height="2" fill="black"/>
<rect x="57" y="8" width="5" height="2" fill="black"/>
<rect x="64" width="2" height="10" fill="black"/>
<rect x="64" width="2" height="10" fill="black"/>
<rect x="69" width="2" height="10" fill="black"/>
<rect x="69" width="2" height="10" fill="black"/>
<rect x="64" y="4" width="7" height="2" fill="black"/>
<rect x="64" y="4" width="7" height="2" fill="black"/>
<rect x="73" width="2" height="10" fill="black"/>
<rect x="73" width="2" height="10" fill="black"/>
<rect x="80" width="2" height="10" fill="black"/>
<rect x="80" width="2" height="10" fill="black"/>
<rect x="77" y="8" width="5" height="2" fill="black"/>
<rect x="77" y="8" width="5" height="2" fill="black"/>
<rect x="84" y="4" width="4" height="2" fill="black"/>
<rect x="84" y="4" width="4" height="2" fill="black"/>
<rect x="88" y="6" width="2" height="2" fill="black"/>
<rect x="88" y="6" width="2" height="2" fill="black"/>
<rect x="90" y="8" width="2" height="2" fill="black"/>
<rect x="90" y="8" width="2" height="2" fill="black"/>
<rect x="88" y="2" width="2" height="2" fill="black"/>
<rect x="88" y="2" width="2" height="2" fill="black"/>
<rect x="90" width="2" height="2" fill="black"/>
<rect x="90" width="2" height="2" fill="black"/>
<rect x="84" width="2" height="10" fill="black"/>
<rect x="84" width="2" height="10" fill="black"/>
<rect x="94" width="2" height="10" fill="black"/>
<rect x="94" width="2" height="10" fill="black"/>
<rect x="94" y="8" width="7" height="2" fill="black"/>
<rect x="94" y="8" width="7" height="2" fill="black"/>
<rect x="103" width="2" height="10" fill="black"/>
<rect x="103" width="2" height="10" fill="black"/>
<rect x="111" width="2" height="10" fill="black"/>
<rect x="111" width="2" height="10" fill="black"/>
<rect x="103" width="10" height="2" fill="black"/>
<rect x="103" width="10" height="2" fill="black"/>
<rect x="109" width="10" height="2" transform="rotate(90 109 0)" fill="black"/>
<rect x="109" width="10" height="2" transform="rotate(90 109 0)" fill="black"/>
<rect x="115" width="2" height="10" fill="black"/>
<rect x="115" width="2" height="10" fill="black"/>
<rect x="115" width="8" height="2" fill="black"/>
<rect x="115" width="8" height="2" fill="black"/>
<rect x="123" width="10" height="2" transform="rotate(90 123 0)" fill="black"/>
<rect x="123" width="10" height="2" transform="rotate(90 123 0)" fill="black"/>
<rect x="125" y="2" width="2" height="6" fill="black"/>
<rect x="125" y="2" width="2" height="6" fill="black"/>
<rect x="131" y="2" width="2" height="6" fill="black"/>
<rect x="131" y="2" width="2" height="6" fill="black"/>
<rect x="127" width="4" height="2" fill="black"/>
<rect x="127" width="4" height="2" fill="black"/>
<rect x="127" y="8" width="4" height="2" fill="black"/>
<rect x="127" y="8" width="4" height="2" fill="black"/>
<rect x="135" width="2" height="10" fill="black"/>
<rect x="135" width="2" height="10" fill="black"/>
<rect x="135" width="7" height="2" fill="black"/>
<rect x="135" width="7" height="2" fill="black"/>
<rect x="135" y="4" width="7" height="2" fill="black"/>
<rect x="135" y="4" width="7" height="2" fill="black"/>
<rect x="140" width="2" height="6" fill="black"/>
<rect x="140" width="2" height="6" fill="black"/>
<rect x="144" y="2" width="2" height="6" fill="black"/>
<rect x="144" y="2" width="2" height="6" fill="black"/>
<rect x="150" y="2" width="2" height="6" fill="black"/>
<rect x="150" y="2" width="2" height="6" fill="black"/>
<rect x="146" width="4" height="2" fill="black"/>
<rect x="146" width="4" height="2" fill="black"/>
<rect x="146" y="8" width="4" height="2" fill="black"/>
<rect x="146" y="8" width="4" height="2" fill="black"/>
<rect x="150" y="10" width="2" height="2" fill="black"/>
<rect x="150" y="10" width="2" height="2" fill="black"/>
<rect x="158" y="6" width="2" height="2" fill="black"/>
<rect x="158" y="6" width="2" height="2" fill="black"/>
<rect x="160" y="8" width="2" height="2" fill="black"/>
<rect x="160" y="8" width="2" height="2" fill="black"/>
<rect x="154" width="2" height="10" fill="black"/>
<rect x="154" width="2" height="10" fill="black"/>
<rect x="154" width="8" height="2" fill="black"/>
<rect x="154" width="8" height="2" fill="black"/>
<rect x="154" y="4" width="8" height="2" fill="black"/>
<rect x="154" y="4" width="8" height="2" fill="black"/>
<rect x="160" width="2" height="6" fill="black"/>
<rect x="160" width="2" height="6" fill="black"/>
<rect x="164" width="8" height="2" fill="black"/>
<rect x="164" width="8" height="2" fill="black"/>
<rect x="164" y="8" width="8" height="2" fill="black"/>
<rect x="164" y="8" width="8" height="2" fill="black"/>
<rect x="164" y="4" width="8" height="2" fill="black"/>
<rect x="164" y="4" width="8" height="2" fill="black"/>
<rect x="164" width="2" height="6" fill="black"/>
<rect x="164" width="2" height="6" fill="black"/>
<rect x="170" y="4" width="2" height="6" fill="black"/>
<rect x="170" y="4" width="2" height="6" fill="black"/>
<rect x="174" width="8" height="2" fill="black"/>
<rect x="174" width="8" height="2" fill="black"/>
<rect x="179" width="10" height="2" transform="rotate(90 179 0)" fill="black"/>
<rect x="179" width="10" height="2" transform="rotate(90 179 0)" fill="black"/>
<rect x="184" width="2" height="10" fill="black"/>
<rect x="184" width="2" height="10" fill="black"/>
<rect x="184" y="8" width="8" height="2" fill="black"/>
<rect x="184" y="8" width="8" height="2" fill="black"/>
<rect x="192" width="10" height="2" transform="rotate(90 192 0)" fill="black"/>
<rect x="192" width="10" height="2" transform="rotate(90 192 0)" fill="black"/>
<rect x="194" width="2" height="4" fill="black"/>
<rect x="194" width="2" height="4" fill="black"/>
<rect x="196.002" y="4" width="1.99902" height="4" fill="black"/>
<rect x="196.002" y="4" width="1.99902" height="4" fill="black"/>
<rect x="200.001" y="4" width="1.99902" height="4" fill="black"/>
<rect x="200.001" y="4" width="1.99902" height="4" fill="black"/>
<rect x="198" y="8" width="1.99902" height="2" fill="black"/>
<rect x="198" y="8" width="1.99902" height="2" fill="black"/>
<rect x="204" width="4" height="2" transform="rotate(90 204 0)" fill="black"/>
<rect x="204" width="4" height="2" transform="rotate(90 204 0)" fill="black"/>
<rect x="206" width="2" height="10" fill="black"/>
<rect x="206" width="2" height="10" fill="black"/>
<rect x="214" width="2" height="10" fill="black"/>
<rect x="214" width="2" height="10" fill="black"/>
<rect x="206" y="8" width="10" height="2" fill="black"/>
<rect x="206" y="8" width="10" height="2" fill="black"/>
<rect x="212" width="10" height="2" transform="rotate(90 212 0)" fill="black"/>
<rect x="212" width="10" height="2" transform="rotate(90 212 0)" fill="black"/>
<rect x="224" y="6" width="2" height="2" fill="black"/>
<rect x="224" y="6" width="2" height="2" fill="black"/>
<rect x="220" y="6" width="2" height="2" fill="black"/>
<rect x="220" y="6" width="2" height="2" fill="black"/>
<rect x="226" y="8" width="2" height="2" fill="black"/>
<rect x="226" y="8" width="2" height="2" fill="black"/>
<rect x="218" y="8" width="2" height="2" fill="black"/>
<rect x="218" y="8" width="2" height="2" fill="black"/>
<rect x="224" y="2" width="2" height="2" fill="black"/>
<rect x="224" y="2" width="2" height="2" fill="black"/>
<rect x="220" y="2" width="2" height="2" fill="black"/>
<rect x="220" y="2" width="2" height="2" fill="black"/>
<rect x="226" width="2" height="2" fill="black"/>
<rect x="226" width="2" height="2" fill="black"/>
<rect x="222" y="4" width="2" height="2" fill="black"/>
<rect x="222" y="4" width="2" height="2" fill="black"/>
<rect x="218" width="2" height="2" fill="black"/>
<rect x="218" width="2" height="2" fill="black"/>
<rect x="230" width="2" height="6" fill="black"/>
<rect x="230" width="2" height="6" fill="black"/>
<rect x="230.001" y="4" width="7.99698" height="2" fill="black"/>
<rect x="230.001" y="4" width="7.99698" height="2" fill="black"/>
<rect x="232" y="6" width="1.99902" height="4" fill="black"/>
<rect x="232" y="6" width="1.99902" height="4" fill="black"/>
<rect x="237.999" width="6" height="2" transform="rotate(90 237.999 0)" fill="black"/>
<rect x="237.999" width="6" height="2" transform="rotate(90 237.999 0)" fill="black"/>
<rect x="239.999" width="6.00101" height="2" fill="black"/>
<rect x="239.999" width="6.00101" height="2" fill="black"/>
<rect x="239.999" y="8" width="6.00101" height="2" fill="black"/>
<rect x="239.999" y="8" width="6.00101" height="2" fill="black"/>
<rect x="240" y="6" width="2" height="2" fill="black"/>
<rect x="240" y="6" width="2" height="2" fill="black"/>
<rect x="244" y="2" width="2" height="2" fill="black"/>
<rect x="244" y="2" width="2" height="2" fill="black"/>
<rect x="242" y="4" width="2" height="2" fill="black"/>
<rect x="242" y="4" width="2" height="2" fill="black"/>
<rect x="250" width="2" height="10" fill="black"/>
<rect x="250" width="2" height="10" fill="black"/>
<rect x="248" width="4" height="2" fill="black"/>
<rect x="248" width="4" height="2" fill="black"/>
<rect x="254" width="4.00201" height="2" fill="black"/>
<rect x="254" width="4.00201" height="2" fill="black"/>
<rect x="254" y="8" width="6.00101" height="2" fill="black"/>
<rect x="254" y="8" width="6.00101" height="2" fill="black"/>
<rect x="254" y="6" width="2" height="2" fill="black"/>
<rect x="254" y="6" width="2" height="2" fill="black"/>
<rect x="258" y="2" width="2" height="2" fill="black"/>
<rect x="258" y="2" width="2" height="2" fill="black"/>
<rect x="256.001" y="4" width="2" height="2" fill="black"/>
<rect x="256.001" y="4" width="2" height="2" fill="black"/>
<rect x="267" width="2" height="10" fill="black"/>
<rect x="267" width="2" height="10" fill="black"/>
<rect x="262" width="7" height="2" fill="black"/>
<rect x="262" width="7" height="2" fill="black"/>
<rect x="262" y="4" width="7" height="2" fill="black"/>
<rect x="262" y="4" width="7" height="2" fill="black"/>
<rect x="262" y="8" width="7" height="2" fill="black"/>
<rect x="262" y="8" width="7" height="2" fill="black"/>
<rect x="271" width="2" height="6" fill="black"/>
<rect x="271" width="2" height="6" fill="black"/>
<rect x="271.002" y="4" width="7.99698" height="2" fill="black"/>
<rect x="271.002" y="4" width="7.99698" height="2" fill="black"/>
<rect x="279" width="10" height="2" transform="rotate(90 279 0)" fill="black"/>
<rect x="279" width="10" height="2" transform="rotate(90 279 0)" fill="black"/>
<rect x="281" width="6.00101" height="2" fill="black"/>
<rect x="281" width="6.00101" height="2" fill="black"/>
<rect x="281" y="8" width="6.00101" height="2" fill="black"/>
<rect x="281" y="8" width="6.00101" height="2" fill="black"/>
<rect x="285" y="6" width="2" height="2" fill="black"/>
<rect x="285" y="6" width="2" height="2" fill="black"/>
<rect x="281" y="2" width="2" height="2" fill="black"/>
<rect x="281" y="2" width="2" height="2" fill="black"/>
<rect x="283.001" y="4" width="2" height="2" fill="black"/>
<rect x="283.001" y="4" width="2" height="2" fill="black"/>
<rect x="289" width="2" height="10" fill="black"/>
<rect x="289" width="2" height="10" fill="black"/>
<rect x="294" y="4" width="2" height="6" fill="black"/>
<rect x="294" y="4" width="2" height="6" fill="black"/>
<rect x="289" width="7" height="2" fill="black"/>
<rect x="289" width="7" height="2" fill="black"/>
<rect x="289" y="4" width="7" height="2" fill="black"/>
<rect x="289" y="4" width="7" height="2" fill="black"/>
<rect x="289" y="8" width="7" height="2" fill="black"/>
<rect x="289" y="8" width="7" height="2" fill="black"/>
<rect x="303" width="2" height="10" fill="black"/>
<rect x="303" width="2" height="10" fill="black"/>
<rect x="298" width="7" height="2" fill="black"/>
<rect x="298" width="7" height="2" fill="black"/>
<rect x="307" width="2" height="10" fill="black"/>
<rect x="307" width="2" height="10" fill="black"/>
<rect x="312" width="2" height="10" fill="black"/>
<rect x="312" width="2" height="10" fill="black"/>
<rect x="307" width="7" height="2" fill="black"/>
<rect x="307" width="7" height="2" fill="black"/>
<rect x="307" y="4" width="7" height="2" fill="black"/>
<rect x="307" y="4" width="7" height="2" fill="black"/>
<rect x="307" y="8" width="7" height="2" fill="black"/>
<rect x="307" y="8" width="7" height="2" fill="black"/>
<rect x="316" width="2" height="6" fill="black"/>
<rect x="316" width="2" height="6" fill="black"/>
<rect x="321" width="2" height="10" fill="black"/>
<rect x="321" width="2" height="10" fill="black"/>
<rect x="316" width="7" height="2" fill="black"/>
<rect x="316" width="7" height="2" fill="black"/>
<rect x="316" y="4" width="7" height="2" fill="black"/>
<rect x="316" y="4" width="7" height="2" fill="black"/>
<rect x="316" y="8" width="7" height="2" fill="black"/>
<rect x="316" y="8" width="7" height="2" fill="black"/>
<rect x="325" width="2" height="10" fill="black"/>
<rect x="325" width="2" height="10" fill="black"/>
<rect x="333" width="2" height="10" fill="black"/>
<rect x="333" width="2" height="10" fill="black"/>
<rect x="325" width="10" height="2" fill="black"/>
<rect x="325" width="10" height="2" fill="black"/>
<rect x="329" y="4" width="2" height="2" fill="black"/>
<rect x="329" y="4" width="2" height="2" fill="black"/>
<rect x="325" y="8" width="10" height="2" fill="black"/>
<rect x="325" y="8" width="10" height="2" fill="black"/>
<rect x="337" width="2" height="6" fill="black"/>
<rect x="337" width="2" height="6" fill="black"/>
<rect x="337" y="8" width="2" height="2" fill="black"/>
<rect x="337" y="8" width="2" height="2" fill="black"/>
<rect x="345" y="2" width="2" height="2" fill="black"/>
<rect x="345" y="2" width="2" height="2" fill="black"/>
<rect x="343" width="2" height="2" fill="black"/>
<rect x="343" width="2" height="2" fill="black"/>
<rect x="343" y="8" width="2" height="2" fill="black"/>
<rect x="343" y="8" width="2" height="2" fill="black"/>
<rect x="341" width="2" height="2" fill="black"/>
<rect x="341" width="2" height="2" fill="black"/>
<rect x="343" y="4" width="2" height="2" fill="black"/>
<rect x="343" y="4" width="2" height="2" fill="black"/>
<rect x="349" y="8" width="2" height="2" fill="black"/>
<rect x="349" y="8" width="2" height="2" fill="black"/>
<rect x="349" y="4" width="2" height="2" fill="black"/>
<rect x="349" y="4" width="2" height="2" fill="black"/>
<rect x="353" y="8" width="2" height="2" fill="black"/>
<rect x="353" y="8" width="2" height="2" fill="black"/>
<rect x="357" y="8" width="2" height="4" fill="black"/>
<rect x="357" y="8" width="2" height="4" fill="black"/>
</svg>"""

# Character order matching left-to-right in the SVG
CHAR_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?:.,'"[:-1]  # 41 glyphs in SVG sheet

# Arrow glyphs (left arrow ← then right arrow →, separated by gap)
ARROWS_SVG = """<svg width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="4" width="2" height="2" fill="black"/>
<rect x="4" y="8" width="2" height="2" fill="black"/>
<rect x="2" y="6" width="2" height="2" fill="black"/>
<rect x="2" y="2" width="2" height="2" fill="black"/>
<rect y="4" width="2" height="2" fill="black"/>
<rect x="9" width="2" height="2" fill="black"/>
<rect x="9" y="8" width="2" height="2" fill="black"/>
<rect x="11" y="6" width="2" height="2" fill="black"/>
<rect x="11" y="2" width="2" height="2" fill="black"/>
<rect x="13" y="4" width="2" height="2" fill="black"/>
</svg>"""

# Font metrics (SVG coords: y=0 top, y=10 bottom; font: y=0 baseline, up is positive)
UPM        = 1000
SCALE      = 100    # 1 SVG unit = 100 font units
SVG_H      = 10     # glyph height in SVG units
CAP_H      = SVG_H * SCALE   # 1000
ASCENDER   = CAP_H
DESCENDER  = -200   # a little below baseline for descenders/punctuation
LINE_GAP   = 0
SIDE_BEAR  = 100    # left/right side-bearing in font units


# ── Parse SVG rects ───────────────────────────────────────────────────────────

def parse_rects(svg_text):
    """Return deduplicated list of (x, y, w, h) in SVG coordinates."""
    import xml.etree.ElementTree as ET
    root = ET.fromstring(svg_text)
    seen = set()
    out  = []
    for el in root.iter('{http://www.w3.org/2000/svg}rect'):
        x = float(el.get('x', 0))
        y = float(el.get('y', 0))
        w = float(el.get('width',  0))
        h = float(el.get('height', 0))
        tr = el.get('transform', '')
        m  = re.match(r'rotate\(90\s+([\d.]+)\s+([\d.]+)\)', tr)
        if m:
            cx, cy = float(m.group(1)), float(m.group(2))
            # rotate 90° CCW around (cx,cy):  x'=cx+cy-y-h, y'=cy-cx+x, w'=h, h'=w
            x, y, w, h = cx+cy-y-h, cy-cx+x, h, w
        key = (round(x,2), round(y,2), round(w,2), round(h,2))
        if key not in seen:
            seen.add(key)
            out.append(key)
    return sorted(out, key=lambda r: (r[0], r[1]))


def group_chars(rects):
    """Split rects into per-character groups based on x-gaps."""
    groups = []
    cur    = [rects[0]]
    cur_max_x = rects[0][0] + rects[0][2]
    for r in rects[1:]:
        if r[0] > cur_max_x + 1.5:
            groups.append(cur)
            cur = [r]
            cur_max_x = r[0] + r[2]
        else:
            cur.append(r)
            cur_max_x = max(cur_max_x, r[0]+r[2])
    groups.append(cur)
    return groups


# ── Glyph drawing ─────────────────────────────────────────────────────────────

def draw_glyph(pen, rects, x_offset):
    """Draw pixel rectangles onto a TTGlyphPen (font coordinates)."""
    for (rx, ry, rw, rh) in rects:
        lx = round((rx - x_offset) * SCALE + SIDE_BEAR)
        ly = round((SVG_H - ry - rh) * SCALE)
        ux = round((rx - x_offset + rw) * SCALE + SIDE_BEAR)
        uy = round((SVG_H - ry) * SCALE)
        pen.moveTo((lx, ly))
        pen.lineTo((ux, ly))
        pen.lineTo((ux, uy))
        pen.lineTo((lx, uy))
        pen.closePath()


# ── Build font ────────────────────────────────────────────────────────────────

def build_font(out_path_ttf):
    rects  = parse_rects(SVG)
    groups = group_chars(rects)

    print(f"Found {len(groups)} character groups for {len(CHAR_ORDER)} characters")
    if len(groups) != len(CHAR_ORDER):
        print("WARNING: group count mismatch – check CHAR_ORDER or SVG parsing")
        # Pad or trim
        while len(groups) < len(CHAR_ORDER):
            groups.append([])

    fb = FontBuilder(UPM, isTTF=True)

    # Collect glyph names
    upper   = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    lower   = list("abcdefghijklmnopqrstuvwxyz")
    digits  = list("0123456789")
    puncts  = list("!?:.,")
    space_w = 4 * SCALE + 2 * SIDE_BEAR

    glyph_names = ['.notdef', 'space'] + upper + lower + digits + puncts + ['arrowleft', 'arrowright']
    fb.setupGlyphOrder(glyph_names)

    # cmap: map Unicode codepoints → glyph name
    cmap = {0x0020: 'space'}
    for c in upper:
        cmap[ord(c)] = c
    for c in lower:
        cmap[ord(c)] = c.upper()   # lowercase → same glyph as uppercase
    for c in digits:
        cmap[ord(c)] = c
    for c in puncts:
        cmap[ord(c)] = c
    cmap[0x2190] = 'arrowleft'
    cmap[0x2192] = 'arrowright'

    fb.setupCharacterMap(cmap)

    # Build each glyph
    metrics    = {}   # glyph_name → (advance_width, lsb)
    glyph_data = {}   # glyph_name → TTGlyphPen

    # .notdef  — empty box
    pen = TTGlyphPen(None)
    bw  = 6 * SCALE + 2 * SIDE_BEAR
    bh  = SVG_H * SCALE
    pen.moveTo((SIDE_BEAR, 0));     pen.lineTo((bw-SIDE_BEAR, 0))
    pen.lineTo((bw-SIDE_BEAR, bh)); pen.lineTo((SIDE_BEAR, bh)); pen.closePath()
    glyph_data['.notdef'] = pen.glyph()
    metrics['.notdef']    = (bw, SIDE_BEAR)

    # space
    pen = TTGlyphPen(None)
    glyph_data['space'] = pen.glyph()
    metrics['space']    = (space_w, 0)

    # Glyphs from SVG
    for i, ch in enumerate(CHAR_ORDER):
        if i >= len(groups):
            break
        group  = groups[i]
        if not group:
            continue
        min_x  = min(r[0] for r in group)
        max_x  = max(r[0]+r[2] for r in group)
        adv    = round((max_x - min_x) * SCALE + 2 * SIDE_BEAR)

        pen = TTGlyphPen(None)
        draw_glyph(pen, group, min_x)
        g = pen.glyph()

        # Determine glyph name
        if ch.isalpha():
            name = ch.upper()
        elif ch.isdigit():
            name = ch
        else:
            name = ch  # !, ?, :, ., ,

        glyph_data[name] = g
        metrics[name]    = (adv, SIDE_BEAR)

        # Lowercase shares the same glyph object
        if ch.isalpha():
            lower_name = ch.lower()
            glyph_data[lower_name] = g
            metrics[lower_name]    = (adv, SIDE_BEAR)

    # Arrow glyphs
    arrow_groups = group_chars(parse_rects(ARROWS_SVG))
    arrow_names  = ['arrowleft', 'arrowright']
    for i, aname in enumerate(arrow_names):
        if i >= len(arrow_groups):
            break
        grp   = arrow_groups[i]
        min_x = min(r[0] for r in grp)
        max_x = max(r[0] + r[2] for r in grp)
        adv   = round((max_x - min_x) * SCALE + 2 * SIDE_BEAR)
        pen   = TTGlyphPen(None)
        draw_glyph(pen, grp, min_x)
        glyph_data[aname] = pen.glyph()
        metrics[aname]    = (adv, SIDE_BEAR)

    # Fill any missing glyphs
    for name in glyph_names:
        if name not in glyph_data:
            pen = TTGlyphPen(None)
            glyph_data[name] = pen.glyph()
            metrics[name]    = (space_w, 0)

    fb.setupGlyf(glyph_data)
    fb.setupHorizontalMetrics(metrics)

    fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER)
    fb.setupNameTable({
        'familyName':    'CommPixel',
        'styleName':     'Regular',
        'fullName':      'CommPixel Regular',
        'psName':        'CommPixel-Regular',
        'version':       'Version 1.0',
        'copyright':     'Communiculture / Futurefarmers',
    })
    fb.setupOS2(
        sTypoAscender=ASCENDER, sTypoDescender=DESCENDER, sTypoLineGap=LINE_GAP,
        usWinAscent=ASCENDER,   usWinDescent=abs(DESCENDER),
        sxHeight=CAP_H, sCapHeight=CAP_H,
        achVendID='CCLT',
        fsType=0,
    )
    fb.setupPost()
    fb.setupHead(unitsPerEm=UPM)

    fb.font.save(out_path_ttf)
    print(f"Saved TTF → {out_path_ttf}")

    # Convert to WOFF2
    from fontTools import subset
    from fontTools.ttLib import TTFont
    ttf = TTFont(out_path_ttf)
    woff2_path = out_path_ttf.replace('.ttf', '.woff2')
    ttf.flavor = 'woff2'
    ttf.save(woff2_path)
    print(f"Saved WOFF2 → {woff2_path}")

    # Also WOFF1
    ttf2 = TTFont(out_path_ttf)
    ttf2.flavor = 'woff'
    woff_path = out_path_ttf.replace('.ttf', '.woff')
    ttf2.save(woff_path)
    print(f"Saved WOFF → {woff_path}")


if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'public')
    os.makedirs(out_dir, exist_ok=True)
    build_font(os.path.join(out_dir, 'CommPixel.ttf'))
