"""Compares the Figma variants with the browser captures of the same designs.

python tools/figma-native/compare.py <section-id> <export.png> <scale> [<section-id> <export.png> <scale> ...]
  export.png: download_assets' render of that section; build/figma/native/compare/positions.json holds where each
  variant sits in its section (from use_figma). Each variant is cut out of the render, set beside its capture (capture
  left, Figma right) in build/figma/native/compare/pairs/, and scored: the mean colour difference after both are scaled
  to the same size. A moved block, a lost layer or a wrong stacking order raises the score; the ground behind a
  transparent design differs between the two (the page's ground, the set's grey), which sets a floor, not a signal.
  The report (compare/report.json, worst first) is merged across runs."""
import json, os, re, sys
from PIL import Image, ImageChops, ImageStat

ROOT = 'C:/Claude Database/punch-exercise'
N = ROOT + '/build/figma/native'
CAP = ROOT + '/build/figma/cap'
OUT = N + '/compare'
os.makedirs(OUT + '/pairs', exist_ok=True)
Image.MAX_IMAGE_PIXELS = None

index = json.load(open(N + '/index-all.json', encoding='utf8'))['items']
positions = {p[0]: p for p in json.load(open(OUT + '/positions.json', encoding='utf8'))}


def clean(s):
    return re.sub(r'\s+', ' ', re.sub(r'[,=]', ' ', s or '')).strip().lower()


def capture_for(surface, page_label, sec_label, name):
    for it in index:
        if it['kind'] == 'section' and it['surface'] == surface and it['pageLabel'] == page_label and it['secLabel'] == sec_label and clean(it['name']) == clean(name):
            p = f"{CAP}/{surface}/{it['page']}/{it['sec']}-{it['i']}.png"
            return p if os.path.exists(p) else None
    return None


try:
    report = {r['key']: r for r in json.load(open(OUT + '/report.json', encoding='utf8'))}
except Exception:
    report = {}

args = sys.argv[1:]
for i in range(0, len(args), 3):
    sid, png, scale = args[i], args[i + 1], float(args[i + 2])
    sec = positions[sid]
    surface = 'machine' if sec[1].startswith('Machine') else 'phone'
    page_label = sec[1].split(' / ', 1)[1]
    img = Image.open(png).convert('RGB')
    # the export pads the section evenly on every side
    ox, oy = (img.size[0] - sec[2] * scale) / 2, (img.size[1] - sec[3] * scale) / 2
    for set_name, variants in sec[4]:
        for name, x, y, w, h in variants:
            fig = img.crop((round(ox + x * scale), round(oy + y * scale), round(ox + (x + w) * scale), round(oy + (y + h) * scale)))
            cap = capture_for(surface, page_label, set_name, name)
            key = f'{sec[1]} / {set_name} / {name}'
            safe = re.sub(r'[^\w]+', '_', key)[:100]
            if not cap:
                report[key] = {'key': key, 'score': None, 'note': 'no capture'}
                continue
            ref = Image.open(cap).convert('RGB')
            # captures were shot with a little room above and below the design: trim it evenly
            sx = ref.size[0] / w
            extra = ref.size[1] - h * sx
            if extra > 1:
                ref = ref.crop((0, round(extra / 2), ref.size[0], round(extra / 2 + h * sx)))
            aspect = abs((h / w) - (ref.size[1] / ref.size[0])) / (ref.size[1] / ref.size[0])
            ref = ref.resize(fig.size, Image.LANCZOS)
            score = ImageStat.Stat(ImageChops.difference(fig, ref).convert('L')).mean[0]
            pair = Image.new('RGB', (fig.size[0] * 2 + 6, fig.size[1]), (255, 0, 255))
            pair.paste(ref, (0, 0))
            pair.paste(fig, (fig.size[0] + 6, 0))
            pair.save(f'{OUT}/pairs/{safe}.png')
            report[key] = {'key': key, 'score': round(score, 2), 'aspect': round(aspect, 3), 'pair': safe + '.png'}

rows = sorted(report.values(), key=lambda r: -((r['score'] or 0) + 200 * (r.get('aspect') or 0)))
json.dump(rows, open(OUT + '/report.json', 'w', encoding='utf8'), indent=1)
scored = [r for r in rows if r['score'] is not None]
print('variants', len(rows), 'compared', len(scored), 'mean', round(sum(r['score'] for r in scored) / max(1, len(scored)), 2))
for r in rows[:12]:
    print(r['score'], r.get('aspect'), r['key'], r.get('note', ''))
