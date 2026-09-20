# The cover's key visual, exported from Figma at 1.5 MB. Two of its four photographs are drawn in a 216 x 142 box
# but embedded at 1200 x 1800 and 1800 x 1350, so they are resampled to three times the box (past any retina
# screen) and re-embedded; the vector part is left exactly as exported, only the whitespace and the export's id
# suffix go.  python tools/tmp/optimize-svg.py <in.svg> <out.svg>
import re, io, sys, base64
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
s = io.open(src, encoding="utf-8").read()
before = len(s)

def box_of(pattern_id):
    m = re.search(r'<(rect|path)[^>]*fill="url\(#%s\)"[^>]*>' % pattern_id, s)
    if not m:
        return None
    w = re.search(r'width="([\d.]+)"', m.group(0)); h = re.search(r'height="([\d.]+)"', m.group(0))
    if w and h:
        return float(w.group(1)), float(h.group(1))
    return None

report = []
def shrink(m):
    fmt, b64 = m.group(2), m.group(3)
    head = m.group(1)
    idm = re.search(r'id="(image\d+)_', head)
    n = idm.group(1)[5:] if idm else None
    raw = base64.b64decode(b64)
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    box = box_of("pattern%s_146_12868" % n) if n is not None else None
    target = None
    if box:
        # three times the drawn box: 3x is beyond any screen's device pixel ratio for this page
        tw, th = int(round(box[0] * 3)), int(round(box[1] * 3))
        # the pattern is FILL (cover): the image's shorter relative side sets the scale
        k = max(tw / im.width, th / im.height)
        if k < 1:
            target = (max(1, int(round(im.width * k))), max(1, int(round(im.height * k))))
    if not target:
        # drawn near its own size already: the export's bytes stay exactly as they are
        report.append((n, im.size, im.size, len(raw), len(raw)))
        return m.group(0)
    im = im.resize(target, Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=86, optimize=True, progressive=True)
    new = base64.b64encode(buf.getvalue()).decode("ascii")
    report.append((n, Image.open(io.BytesIO(raw)).size, im.size, len(raw), len(buf.getvalue())))
    return head + 'xlink:href="data:image/jpeg;base64,' + new + '"'

s = re.sub(r'(<image [^>]*?)xlink:href="data:image/(\w+);base64,([^"]+)"', shrink, s)

# path coordinates carry four to six decimals from the export; on an 839-unit drawing two decimals is a fiftieth of
# a pixel at double density, so the shapes are the same shapes
def round_d(m):
    d = re.sub(r"(-?\d+\.\d+)", lambda x: ("%.2f" % float(x.group(1))).rstrip("0").rstrip("."), m.group(2))
    return m.group(1) + d + '"'
s = re.sub(r'(<path[^>]* d=")([^"]+)"', round_d, s)

# the export's id suffix and the whitespace between tags
s = s.replace("_146_12868", "")
s = re.sub(r">\s+<", "><", s)
s = re.sub(r"\s+", " ", s)
s = s.replace(' />', '/>').replace('<?xml version="1.0" encoding="UTF-8"?> ', '')
io.open(out, "w", encoding="utf-8", newline="\n").write(s.strip())

print("%s: %d -> %d bytes (%.0f%%)" % (out, before, len(s), 100.0 * len(s) / before))
for n, was, now, b0, b1 in report:
    print("  image%s %sx%s -> %sx%s  %d -> %d bytes" % (n, was[0], was[1], now[0], now[1], b0, b1))
