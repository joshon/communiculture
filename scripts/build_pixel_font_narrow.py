#!/usr/bin/env python3
"""
Generates CommPixelNarrow TTF + WOFF2 + WOFF from the narrow glyph SVG sheet.

Character order in the SVG (left to right):
  ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?:.,
"""

import re
import os
import xml.etree.ElementTree as ET
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

SVG = """<svg width="313" height="12" viewBox="0 0 313 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="2" height="10" fill="black"/>
<rect width="2" height="10" fill="black"/>
<rect x="4" width="2" height="10" fill="black"/>
<rect x="4" width="2" height="10" fill="black"/>
<rect width="6" height="2" fill="black"/>
<rect width="6" height="2" fill="black"/>
<rect y="4" width="6" height="2" fill="black"/>
<rect y="4" width="6" height="2" fill="black"/>
<rect x="9" width="2" height="10" fill="black"/>
<rect x="9" width="2" height="10" fill="black"/>
<rect x="13" y="2" width="2" height="2" fill="black"/>
<rect x="13" y="2" width="2" height="2" fill="black"/>
<rect x="13" y="6" width="2" height="2" fill="black"/>
<rect x="13" y="6" width="2" height="2" fill="black"/>
<rect x="9" width="4" height="2" fill="black"/>
<rect x="9" width="4" height="2" fill="black"/>
<rect x="9" y="4" width="4" height="2" fill="black"/>
<rect x="9" y="4" width="4" height="2" fill="black"/>
<rect x="9" y="8" width="4" height="2" fill="black"/>
<rect x="9" y="8" width="4" height="2" fill="black"/>
<rect x="18" y="2" width="2" height="6" fill="black"/>
<rect x="18" y="2" width="2" height="6" fill="black"/>
<rect x="20" width="4" height="2" fill="black"/>
<rect x="20" width="4" height="2" fill="black"/>
<rect x="20" y="8" width="4" height="2" fill="black"/>
<rect x="20" y="8" width="4" height="2" fill="black"/>
<rect x="26" width="2" height="10" fill="black"/>
<rect x="26" width="2" height="10" fill="black"/>
<rect x="30" y="2" width="2" height="6" fill="black"/>
<rect x="30" y="2" width="2" height="6" fill="black"/>
<rect x="26" width="4" height="2" fill="black"/>
<rect x="26" width="4" height="2" fill="black"/>
<rect x="26" y="8" width="4" height="2" fill="black"/>
<rect x="26" y="8" width="4" height="2" fill="black"/>
<rect x="34" width="2" height="10" fill="black"/>
<rect x="34" width="2" height="10" fill="black"/>
<rect x="34" width="6" height="2" fill="black"/>
<rect x="34" width="6" height="2" fill="black"/>
<rect x="34" y="4" width="6" height="2" fill="black"/>
<rect x="34" y="4" width="6" height="2" fill="black"/>
<rect x="34" y="8" width="6" height="2" fill="black"/>
<rect x="34" y="8" width="6" height="2" fill="black"/>
<rect x="42" width="2" height="10" fill="black"/>
<rect x="42" width="2" height="10" fill="black"/>
<rect x="42" width="6" height="2" fill="black"/>
<rect x="42" width="6" height="2" fill="black"/>
<rect x="42" y="4" width="6" height="2" fill="black"/>
<rect x="42" y="4" width="6" height="2" fill="black"/>
<rect x="54" y="6" width="2" height="4" fill="black"/>
<rect x="54" y="6" width="2" height="4" fill="black"/>
<rect x="50" y="2" width="2" height="6" fill="black"/>
<rect x="50" y="2" width="2" height="6" fill="black"/>
<rect x="52" width="4" height="2" fill="black"/>
<rect x="52" width="4" height="2" fill="black"/>
<rect x="52" y="8" width="4" height="2" fill="black"/>
<rect x="52" y="8" width="4" height="2" fill="black"/>
<rect x="58" width="2" height="10" fill="black"/>
<rect x="58" width="2" height="10" fill="black"/>
<rect x="62" width="2" height="10" fill="black"/>
<rect x="62" width="2" height="10" fill="black"/>
<rect x="58" y="4" width="6" height="2" fill="black"/>
<rect x="58" y="4" width="6" height="2" fill="black"/>
<rect x="66" width="2" height="10" fill="black"/>
<rect x="66" width="2" height="10" fill="black"/>
<rect x="73" width="2" height="10" fill="black"/>
<rect x="73" width="2" height="10" fill="black"/>
<rect x="70" y="8" width="5" height="2" fill="black"/>
<rect x="70" y="8" width="5" height="2" fill="black"/>
<rect x="77" y="4" width="4" height="2" fill="black"/>
<rect x="77" y="4" width="4" height="2" fill="black"/>
<rect x="81" y="6" width="2" height="4" fill="black"/>
<rect x="81" y="6" width="2" height="4" fill="black"/>
<rect x="81" y="2" width="2" height="2" fill="black"/>
<rect x="81" y="2" width="2" height="2" fill="black"/>
<rect x="77" width="2" height="10" fill="black"/>
<rect x="77" width="2" height="10" fill="black"/>
<rect x="85" width="2" height="10" fill="black"/>
<rect x="85" width="2" height="10" fill="black"/>
<rect x="85" y="8" width="6" height="2" fill="black"/>
<rect x="85" y="8" width="6" height="2" fill="black"/>
<rect x="93" width="2" height="10" fill="black"/>
<rect x="93" width="2" height="10" fill="black"/>
<rect x="101" width="2" height="10" fill="black"/>
<rect x="101" width="2" height="10" fill="black"/>
<rect x="93" width="10" height="2" fill="black"/>
<rect x="93" width="10" height="2" fill="black"/>
<rect x="99" width="10" height="2" transform="rotate(90 99 0)" fill="black"/>
<rect x="99" width="10" height="2" transform="rotate(90 99 0)" fill="black"/>
<rect x="105" width="2" height="10" fill="black"/>
<rect x="105" width="2" height="10" fill="black"/>
<rect x="105" width="6" height="2" fill="black"/>
<rect x="105" width="6" height="2" fill="black"/>
<rect x="111" width="10" height="2" transform="rotate(90 111 0)" fill="black"/>
<rect x="111" width="10" height="2" transform="rotate(90 111 0)" fill="black"/>
<rect x="113" y="2" width="2" height="6" fill="black"/>
<rect x="113" y="2" width="2" height="6" fill="black"/>
<rect x="117" y="2" width="2" height="6" fill="black"/>
<rect x="117" y="2" width="2" height="6" fill="black"/>
<rect x="115" width="2" height="2" fill="black"/>
<rect x="115" width="2" height="2" fill="black"/>
<rect x="115" y="8" width="2" height="2" fill="black"/>
<rect x="115" y="8" width="2" height="2" fill="black"/>
<rect x="121" width="2" height="10" fill="black"/>
<rect x="121" width="2" height="10" fill="black"/>
<rect x="121" width="6" height="2" fill="black"/>
<rect x="121" width="6" height="2" fill="black"/>
<rect x="121" y="4" width="6" height="2" fill="black"/>
<rect x="121" y="4" width="6" height="2" fill="black"/>
<rect x="125" width="2" height="6" fill="black"/>
<rect x="125" width="2" height="6" fill="black"/>
<rect x="129" y="2" width="2" height="6" fill="black"/>
<rect x="129" y="2" width="2" height="6" fill="black"/>
<rect x="133" y="2" width="2" height="6" fill="black"/>
<rect x="133" y="2" width="2" height="6" fill="black"/>
<rect x="131" width="2" height="2" fill="black"/>
<rect x="131" width="2" height="2" fill="black"/>
<rect x="131" y="8" width="2" height="2" fill="black"/>
<rect x="131" y="8" width="2" height="2" fill="black"/>
<rect x="133" y="10" width="2" height="2" fill="black"/>
<rect x="133" y="10" width="2" height="2" fill="black"/>
<rect x="141" y="6" width="2" height="4" fill="black"/>
<rect x="141" y="6" width="2" height="4" fill="black"/>
<rect x="137" width="2" height="10" fill="black"/>
<rect x="137" width="2" height="10" fill="black"/>
<rect x="137" width="6" height="2" fill="black"/>
<rect x="137" width="6" height="2" fill="black"/>
<rect x="137" y="4" width="4" height="2" fill="black"/>
<rect x="137" y="4" width="4" height="2" fill="black"/>
<rect x="141" width="2" height="4" fill="black"/>
<rect x="141" width="2" height="4" fill="black"/>
<rect x="145" width="6" height="2" fill="black"/>
<rect x="145" width="6" height="2" fill="black"/>
<rect x="145" y="8" width="6" height="2" fill="black"/>
<rect x="145" y="8" width="6" height="2" fill="black"/>
<rect x="145" y="4" width="6" height="2" fill="black"/>
<rect x="145" y="4" width="6" height="2" fill="black"/>
<rect x="145" width="2" height="6" fill="black"/>
<rect x="145" width="2" height="6" fill="black"/>
<rect x="149" y="4" width="2" height="6" fill="black"/>
<rect x="149" y="4" width="2" height="6" fill="black"/>
<rect x="153" width="6" height="2" fill="black"/>
<rect x="153" width="6" height="2" fill="black"/>
<rect x="157" width="10" height="2" transform="rotate(90 157 0)" fill="black"/>
<rect x="157" width="10" height="2" transform="rotate(90 157 0)" fill="black"/>
<rect x="161" width="2" height="10" fill="black"/>
<rect x="161" width="2" height="10" fill="black"/>
<rect x="161" y="8" width="6" height="2" fill="black"/>
<rect x="161" y="8" width="6" height="2" fill="black"/>
<rect x="167" width="10" height="2" transform="rotate(90 167 0)" fill="black"/>
<rect x="167" width="10" height="2" transform="rotate(90 167 0)" fill="black"/>
<rect x="169" width="2" height="8" fill="black"/>
<rect x="169" width="2" height="8" fill="black"/>
<rect x="171" y="8" width="1.99902" height="2" fill="black"/>
<rect x="171" y="8" width="1.99902" height="2" fill="black"/>
<rect x="175" width="8" height="2" transform="rotate(90 175 0)" fill="black"/>
<rect x="175" width="8" height="2" transform="rotate(90 175 0)" fill="black"/>
<rect x="177" width="2" height="10" fill="black"/>
<rect x="177" width="2" height="10" fill="black"/>
<rect x="185" width="2" height="10" fill="black"/>
<rect x="185" width="2" height="10" fill="black"/>
<rect x="177" y="8" width="10" height="2" fill="black"/>
<rect x="177" y="8" width="10" height="2" fill="black"/>
<rect x="183" width="10" height="2" transform="rotate(90 183 0)" fill="black"/>
<rect x="183" width="10" height="2" transform="rotate(90 183 0)" fill="black"/>
<rect x="193" y="6" width="2" height="4" fill="black"/>
<rect x="193" y="6" width="2" height="4" fill="black"/>
<rect x="189" y="6" width="2" height="4" fill="black"/>
<rect x="189" y="6" width="2" height="4" fill="black"/>
<rect x="193" width="2" height="4" fill="black"/>
<rect x="193" width="2" height="4" fill="black"/>
<rect x="189" width="2" height="4" fill="black"/>
<rect x="189" width="2" height="4" fill="black"/>
<rect x="191.001" y="4" width="2" height="2" fill="black"/>
<rect x="191.001" y="4" width="2" height="2" fill="black"/>
<rect x="197" width="2" height="6" fill="black"/>
<rect x="197" width="2" height="6" fill="black"/>
<rect x="197.002" y="4" width="5.99707" height="2" fill="black"/>
<rect x="197.002" y="4" width="5.99707" height="2" fill="black"/>
<rect x="199" y="6" width="1.99902" height="4" fill="black"/>
<rect x="199" y="6" width="1.99902" height="4" fill="black"/>
<rect x="202.999" width="6" height="2" transform="rotate(90 202.999 0)" fill="black"/>
<rect x="202.999" width="6" height="2" transform="rotate(90 202.999 0)" fill="black"/>
<rect x="205" width="6.00101" height="2" fill="black"/>
<rect x="205" width="6.00101" height="2" fill="black"/>
<rect x="205" y="8" width="6.00101" height="2" fill="black"/>
<rect x="205" y="8" width="6.00101" height="2" fill="black"/>
<rect x="205.001" y="6" width="2" height="2" fill="black"/>
<rect x="205.001" y="6" width="2" height="2" fill="black"/>
<rect x="209.001" y="2" width="2" height="2" fill="black"/>
<rect x="209.001" y="2" width="2" height="2" fill="black"/>
<rect x="207.002" y="4" width="2" height="2" fill="black"/>
<rect x="207.002" y="4" width="2" height="2" fill="black"/>
<rect x="215.001" width="2" height="10" fill="black"/>
<rect x="215.001" width="2" height="10" fill="black"/>
<rect x="213.001" width="4" height="2" fill="black"/>
<rect x="213.001" width="4" height="2" fill="black"/>
<rect x="219.001" width="4.00201" height="2" fill="black"/>
<rect x="219.001" width="4.00201" height="2" fill="black"/>
<rect x="219.001" y="8" width="6.00101" height="2" fill="black"/>
<rect x="219.001" y="8" width="6.00101" height="2" fill="black"/>
<rect x="219.002" y="6" width="2" height="2" fill="black"/>
<rect x="219.002" y="6" width="2" height="2" fill="black"/>
<rect x="223.002" y="2" width="2" height="2" fill="black"/>
<rect x="223.002" y="2" width="2" height="2" fill="black"/>
<rect x="221.003" y="4" width="2" height="2" fill="black"/>
<rect x="221.003" y="4" width="2" height="2" fill="black"/>
<rect x="231.002" width="2" height="10" fill="black"/>
<rect x="231.002" width="2" height="10" fill="black"/>
<rect x="227.002" width="6" height="2" fill="black"/>
<rect x="227.002" width="6" height="2" fill="black"/>
<rect x="227.002" y="4" width="6" height="2" fill="black"/>
<rect x="227.002" y="4" width="6" height="2" fill="black"/>
<rect x="227.002" y="8" width="6" height="2" fill="black"/>
<rect x="227.002" y="8" width="6" height="2" fill="black"/>
<rect x="235.002" width="2" height="6" fill="black"/>
<rect x="235.002" width="2" height="6" fill="black"/>
<rect x="235.004" y="4" width="5.99707" height="2" fill="black"/>
<rect x="235.004" y="4" width="5.99707" height="2" fill="black"/>
<rect x="241.001" width="10" height="2" transform="rotate(90 241.001 0)" fill="black"/>
<rect x="241.001" width="10" height="2" transform="rotate(90 241.001 0)" fill="black"/>
<rect x="243.002" width="6.00101" height="2" fill="black"/>
<rect x="243.002" width="6.00101" height="2" fill="black"/>
<rect x="243.002" y="8" width="6.00101" height="2" fill="black"/>
<rect x="243.002" y="8" width="6.00101" height="2" fill="black"/>
<rect x="247.002" y="6" width="2" height="2" fill="black"/>
<rect x="247.002" y="6" width="2" height="2" fill="black"/>
<rect x="243.002" y="2" width="2" height="2" fill="black"/>
<rect x="243.002" y="2" width="2" height="2" fill="black"/>
<rect x="245.004" y="4" width="2" height="2" fill="black"/>
<rect x="245.004" y="4" width="2" height="2" fill="black"/>
<rect x="251.003" width="2" height="10" fill="black"/>
<rect x="251.003" width="2" height="10" fill="black"/>
<rect x="255.003" y="4" width="2" height="6" fill="black"/>
<rect x="255.003" y="4" width="2" height="6" fill="black"/>
<rect x="251.003" width="6" height="2" fill="black"/>
<rect x="251.003" width="6" height="2" fill="black"/>
<rect x="251.003" y="4" width="6" height="2" fill="black"/>
<rect x="251.003" y="4" width="6" height="2" fill="black"/>
<rect x="251.003" y="8" width="6" height="2" fill="black"/>
<rect x="251.003" y="8" width="6" height="2" fill="black"/>
<rect x="263.003" width="2" height="10" fill="black"/>
<rect x="263.003" width="2" height="10" fill="black"/>
<rect x="259.003" width="6" height="2" fill="black"/>
<rect x="259.003" width="6" height="2" fill="black"/>
<rect x="267.003" width="2" height="10" fill="black"/>
<rect x="267.003" width="2" height="10" fill="black"/>
<rect x="271.003" width="2" height="10" fill="black"/>
<rect x="271.003" width="2" height="10" fill="black"/>
<rect x="267.003" width="6" height="2" fill="black"/>
<rect x="267.003" width="6" height="2" fill="black"/>
<rect x="267.003" y="4" width="6" height="2" fill="black"/>
<rect x="267.003" y="4" width="6" height="2" fill="black"/>
<rect x="267.003" y="8" width="6" height="2" fill="black"/>
<rect x="267.003" y="8" width="6" height="2" fill="black"/>
<rect x="275.003" width="2" height="6" fill="black"/>
<rect x="275.003" width="2" height="6" fill="black"/>
<rect x="279" width="2" height="10" fill="black"/>
<rect x="279" width="2" height="10" fill="black"/>
<rect x="275.003" width="5.99756" height="2" fill="black"/>
<rect x="275.003" width="5.99756" height="2" fill="black"/>
<rect x="275.003" y="4" width="5.99756" height="2" fill="black"/>
<rect x="275.003" y="4" width="5.99756" height="2" fill="black"/>
<rect x="275.003" y="8" width="5.99756" height="2" fill="black"/>
<rect x="275.003" y="8" width="5.99756" height="2" fill="black"/>
<rect x="283.003" width="2" height="10" fill="black"/>
<rect x="283.003" width="2" height="10" fill="black"/>
<rect x="287.003" width="2" height="10" fill="black"/>
<rect x="287.003" width="2" height="10" fill="black"/>
<rect x="283.003" width="6" height="2" fill="black"/>
<rect x="283.003" width="6" height="2" fill="black"/>
<rect x="283.003" y="8" width="6" height="2" fill="black"/>
<rect x="283.003" y="8" width="6" height="2" fill="black"/>
<rect x="291.003" width="2" height="6" fill="black"/>
<rect x="291.003" width="2" height="6" fill="black"/>
<rect x="291.003" y="8" width="2" height="2" fill="black"/>
<rect x="291.003" y="8" width="2" height="2" fill="black"/>
<rect x="299.003" y="2" width="2" height="2" fill="black"/>
<rect x="299.003" y="2" width="2" height="2" fill="black"/>
<rect x="297.003" width="2" height="2" fill="black"/>
<rect x="297.003" width="2" height="2" fill="black"/>
<rect x="297.003" y="8" width="2" height="2" fill="black"/>
<rect x="297.003" y="8" width="2" height="2" fill="black"/>
<rect x="295.003" width="2" height="2" fill="black"/>
<rect x="295.003" width="2" height="2" fill="black"/>
<rect x="297.003" y="4" width="2" height="2" fill="black"/>
<rect x="297.003" y="4" width="2" height="2" fill="black"/>
<rect x="303.003" y="8" width="2" height="2" fill="black"/>
<rect x="303.003" y="8" width="2" height="2" fill="black"/>
<rect x="303.003" y="4" width="2" height="2" fill="black"/>
<rect x="303.003" y="4" width="2" height="2" fill="black"/>
<rect x="307.003" y="8" width="2" height="2" fill="black"/>
<rect x="307.003" y="8" width="2" height="2" fill="black"/>
<rect x="311.003" y="8" width="2" height="4" fill="black"/>
<rect x="311.003" y="8" width="2" height="4" fill="black"/>
</svg>"""

CHAR_ORDER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!?:.,'"[:-1]  # 41 glyphs

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

UPM       = 1000
SCALE     = 100
SVG_H     = 10
CAP_H     = SVG_H * SCALE
ASCENDER  = CAP_H
DESCENDER = -200
LINE_GAP  = 0
SIDE_BEAR = 80  # slightly tighter side-bearings to match the narrow feel


def parse_rects(svg_text):
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
            x, y, w, h = cx+cy-y-h, cy-cx+x, h, w
        key = (round(x, 2), round(y, 2), round(w, 2), round(h, 2))
        if key not in seen:
            seen.add(key)
            out.append(key)
    return sorted(out, key=lambda r: (r[0], r[1]))


def group_chars(rects):
    groups    = []
    cur       = [rects[0]]
    cur_max_x = rects[0][0] + rects[0][2]
    for r in rects[1:]:
        if r[0] > cur_max_x + 1.5:
            groups.append(cur)
            cur = [r]
            cur_max_x = r[0] + r[2]
        else:
            cur.append(r)
            cur_max_x = max(cur_max_x, r[0] + r[2])
    groups.append(cur)
    return groups


def draw_glyph(pen, rects, x_offset):
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


def build_font(out_path_ttf):
    rects  = parse_rects(SVG)
    groups = group_chars(rects)

    print(f"Found {len(groups)} character groups for {len(CHAR_ORDER)} characters")
    if len(groups) != len(CHAR_ORDER):
        print("WARNING: group count mismatch — check CHAR_ORDER or SVG parsing")
        while len(groups) < len(CHAR_ORDER):
            groups.append([])

    fb = FontBuilder(UPM, isTTF=True)

    upper   = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    lower   = list("abcdefghijklmnopqrstuvwxyz")
    digits  = list("0123456789")
    puncts  = list("!?:.,")
    space_w = 4 * SCALE + 2 * SIDE_BEAR

    glyph_names = ['.notdef', 'space'] + upper + lower + digits + puncts + ['arrowleft', 'arrowright']
    fb.setupGlyphOrder(glyph_names)

    cmap = {0x0020: 'space'}
    for c in upper:
        cmap[ord(c)] = c
    for c in lower:
        cmap[ord(c)] = c.upper()
    for c in digits:
        cmap[ord(c)] = c
    for c in puncts:
        cmap[ord(c)] = c
    cmap[0x2190] = 'arrowleft'
    cmap[0x2192] = 'arrowright'
    fb.setupCharacterMap(cmap)

    metrics    = {}
    glyph_data = {}

    pen = TTGlyphPen(None)
    bw  = 6 * SCALE + 2 * SIDE_BEAR
    bh  = SVG_H * SCALE
    pen.moveTo((SIDE_BEAR, 0));      pen.lineTo((bw - SIDE_BEAR, 0))
    pen.lineTo((bw - SIDE_BEAR, bh)); pen.lineTo((SIDE_BEAR, bh)); pen.closePath()
    glyph_data['.notdef'] = pen.glyph()
    metrics['.notdef']    = (bw, SIDE_BEAR)

    pen = TTGlyphPen(None)
    glyph_data['space'] = pen.glyph()
    metrics['space']    = (space_w, 0)

    for i, ch in enumerate(CHAR_ORDER):
        if i >= len(groups):
            break
        group = groups[i]
        if not group:
            continue
        min_x = min(r[0] for r in group)
        max_x = max(r[0] + r[2] for r in group)
        adv   = round((max_x - min_x) * SCALE + 2 * SIDE_BEAR)

        pen = TTGlyphPen(None)
        draw_glyph(pen, group, min_x)
        g = pen.glyph()

        name = ch.upper() if ch.isalpha() else ch
        glyph_data[name] = g
        metrics[name]    = (adv, SIDE_BEAR)

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

    for name in glyph_names:
        if name not in glyph_data:
            pen = TTGlyphPen(None)
            glyph_data[name] = pen.glyph()
            metrics[name]    = (space_w, 0)

    fb.setupGlyf(glyph_data)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER)
    fb.setupNameTable({
        'familyName': 'CommPixelNarrow',
        'styleName':  'Regular',
        'fullName':   'CommPixelNarrow Regular',
        'psName':     'CommPixelNarrow-Regular',
        'version':    'Version 1.0',
        'copyright':  'Communiculture / Futurefarmers',
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
    print(f"Saved TTF  → {out_path_ttf}")

    ttf = TTFont(out_path_ttf)
    ttf.flavor = 'woff2'
    woff2_path = out_path_ttf.replace('.ttf', '.woff2')
    ttf.save(woff2_path)
    print(f"Saved WOFF2 → {woff2_path}")

    ttf2 = TTFont(out_path_ttf)
    ttf2.flavor = 'woff'
    woff_path = out_path_ttf.replace('.ttf', '.woff')
    ttf2.save(woff_path)
    print(f"Saved WOFF  → {woff_path}")


if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'public')
    os.makedirs(out_dir, exist_ok=True)
    build_font(os.path.join(out_dir, 'CommPixelNarrow.ttf'))
