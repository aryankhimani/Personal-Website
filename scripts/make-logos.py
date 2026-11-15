"""Generates the AK monogram options into public/logos/. Run: python3 scripts/make-logos.py"""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'logos')


def poly(points, dx=0.0, dy=0.0, k=1.0):
    return 'M' + ' L'.join(f'{dx + x * k:.1f} {dy + y * k:.1f}' for x, y in points) + ' Z'


def letter_a(dx, dy, k=1.0, w=100, h=120, s=27, a=37, c=30, b=20):
    """Geometric capital A. s = leg width, a = how far the top is inset, c/b = crossbar position/height."""
    slope = a / h
    outer = [(0, h), (a, 0), (w - a, 0), (w, h), (w - s, h), (w - s - slope * c, h - c), (s + slope * c, h - c), (s, h)]
    y_apex = h * (1 - (w / 2 - s) / a)
    y_bar = h - c - b
    x_bar = a * (1 - y_bar / h) + s
    counter = [(w / 2, y_apex), (w - x_bar, y_bar), (x_bar, y_bar)]
    return poly(outer, dx, dy, k) + ' ' + poly(counter, dx, dy, k)


def letter_k(dx, dy, k=1.0, w=100, h=120, s=27):
    stem = [(0, 0), (s, 0), (s, h), (0, h)]
    arms = [(s, 50), (64, 0), (w, 0), (52, 58), (w, h), (64, h), (38, 80), (s, 94)]
    return poly(stem, dx, dy, k) + ' ' + poly(arms, dx, dy, k)


def svg(body, name):
    doc = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="#000" fill-rule="evenodd">{body}</svg>\n'
    with open(os.path.join(OUT, name), 'w') as f:
        f.write(doc)


def clockwise(points):
    """Same winding for every piece, so overlapping pieces add up instead of cancelling."""
    area = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]))
    return points if area > 0 else points[::-1]


def union(shapes):
    """One path, non-zero fill: touching pieces render as a single solid shape with no seams."""
    return '<path fill-rule="nonzero" d="' + ' '.join(poly(clockwise(p)) for p in shapes) + '"/>'


# 1. Shared stem: the A's right leg is the K's stem, so the two letters are one shape.
def shared_stem():
    stem = [(112, 44), (140, 44), (140, 196), (112, 196)]
    diagonal = [(18, 196), (98, 44), (126, 44), (48, 196)]
    bar = [(76, 140), (112, 140), (112, 162), (66, 162)]
    arms = [(140, 110), (188, 44), (224, 44), (168, 120), (226, 196), (190, 196), (152, 146), (140, 162)]
    return union([stem, diagonal, bar, arms])


# 2. Pixel: drawn on the same kind of grid as the site's typeface.
def pixel():
    a = ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']
    k = ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#']
    cell, x0, y0 = 20, 10, 50
    cells = []
    for col0, glyph in ((0, a), (6, k)):
        for r, row in enumerate(glyph):
            for c, ch in enumerate(row):
                if ch == '#':
                    x, y = x0 + (col0 + c) * cell, y0 + r * cell
                    cells.append([(x, y), (x + cell, y), (x + cell, y + cell), (x, y + cell)])
    return union(cells)


# 3. Keycap: a keyboard key with AK cut out of it.
def keycap():
    key = 'M60 16 H180 A44 44 0 0 1 224 60 V180 A44 44 0 0 1 180 224 H60 A44 44 0 0 1 16 180 V60 A44 44 0 0 1 60 16 Z'
    k = 0.78
    letters = letter_a(38, 73, k) + ' ' + letter_k(126, 73, k)
    return f'<path d="{key} {letters}"/>'


# 4. Orbit: the Aryan OS ring from the menu bar, with AK inside.
def orbit():
    ring = 'M120 8 A112 112 0 1 1 119.9 8 Z M120 26 A94 94 0 1 0 120.1 26 Z'
    k = 0.66
    letters = letter_a(50, 80, k) + ' ' + letter_k(124, 80, k)
    return f'<path d="{ring}"/><path d="{letters}"/>'


svg(shared_stem(), 'ak-1-shared-stem.svg')
svg(pixel(), 'ak-2-pixel.svg')
svg(keycap(), 'ak-3-keycap.svg')
svg(orbit(), 'ak-4-orbit.svg')
print('wrote 4 logos')
