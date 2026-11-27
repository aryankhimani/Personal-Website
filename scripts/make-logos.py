"""Draws the AK logo (the "shared stem" monogram) and the favicon made from it.

Run: python3 scripts/make-logos.py
Writes public/logo.svg (black on transparent, used by the liquid-metal hero), public/favicon.svg and
public/sticker.svg (the playground sticker).
public/favicon.ico is a 32px render of favicon.svg (for browsers and pages that ask for /favicon.ico).
"""
import os

PUBLIC = os.path.join(os.path.dirname(__file__), '..', 'public')


def poly(points):
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in points) + ' Z'


def clockwise(points):
    """Same winding for every piece, so overlapping pieces add up instead of cancelling."""
    area = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]))
    return points if area > 0 else points[::-1]


# The A's right leg is the K's stem, so the two letters are one shape. Drawn on a 240 grid.
STEM = [(112, 44), (140, 44), (140, 196), (112, 196)]
DIAGONAL = [(18, 196), (98, 44), (126, 44), (48, 196)]
BAR = [(76, 140), (112, 140), (112, 162), (66, 162)]
ARMS = [(140, 110), (188, 44), (224, 44), (168, 120), (226, 196), (190, 196), (152, 146), (140, 162)]
# Non-zero fill: touching pieces render as one solid shape with no seams.
D = ' '.join(poly(clockwise(p)) for p in (STEM, DIAGONAL, BAR, ARMS))


def write(name, doc):
    with open(os.path.join(PUBLIC, name), 'w') as f:
        f.write(doc + '\n')


write('logo.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><path fill="#000" d="{D}"/></svg>')

# Favicon: cream mark on the desk colour, scaled to 80% and centred on its bounding box.
write(
    'favicon.svg',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">'
    '<rect width="240" height="240" rx="52" fill="#111113"/>'
    f'<path fill="#ece7dc" transform="translate(22.4 24) scale(0.8)" d="{D}"/></svg>',
)
# Sticker for the playground: a die-cut white edge around an accent tile with the cream mark.
write(
    'sticker.svg',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260">'
    '<rect x="6" y="6" width="248" height="248" rx="60" fill="#ffffff"/>'
    '<rect x="20" y="20" width="220" height="220" rx="48" fill="#ff4a2b"/>'
    f'<path fill="#ece7dc" transform="translate(32.4 34) scale(0.8)" d="{D}"/></svg>',
)
print('wrote public/logo.svg, public/favicon.svg and public/sticker.svg')
