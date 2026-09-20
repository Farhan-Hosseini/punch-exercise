# Every half second of a clip, the outermost ring of pixels must be the box colour (the master) or the stage must show
# no rectangle around the handset (the presentation cut): python tools/tmp/edge-check.py <clip> <hex colour> [step s]
import subprocess, sys, io
from PIL import Image
clip, hexc = sys.argv[1], sys.argv[2]
step = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
want = tuple(int(hexc[i:i + 2], 16) for i in (0, 2, 4))
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clip]).decode().strip())
bad = []
t = 0.0
while t < dur - 0.02:
    png = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', clip, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'])
    im = Image.open(io.BytesIO(png)).convert('RGB'); w, h = im.size
    # the handset's rim reaches the box edge along the sides, so only the corners outside its rounded frame are
    # checked: a box drawn under the phone shows there first
    pts = [p for d in (2, 6, 12, 20) for p in ((d, d), (w - 1 - d, d), (d, h - 1 - d), (w - 1 - d, h - 1 - d))]
    worst = max(sum(abs(a - b) for a, b in zip(im.getpixel(p), want)) for p in pts)
    if worst > 9: bad.append((round(t, 2), worst))
    t += step
print('duration', dur, 'size', w, h, 'frames checked', int(dur / step) + 1)
print('BAD', bad if bad else 'none: every corner is the box colour at every sample')
