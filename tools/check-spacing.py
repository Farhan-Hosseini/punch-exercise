# Keeps the spacing scale honest. Run from showcase/:
#   python ../tools/check-spacing.py           report off-scale values
#   python ../tools/check-spacing.py --apply   snap them to the nearest step
# The scale is defined as --s-* tokens on :root in styles.css and drawn on the Design system page.
import re, glob, sys, io, collections
SCALE = [2,4,6,8,10,12,16,20,24,28,32,36,40,48,56,64,72,80,96,112,128,160,192]
def snap(x):
    if x in SCALE: return x
    if x <= 1: return x                       # hairlines stay
    if x > 192: return x                      # very large one-offs stay
    best = min(SCALE, key=lambda s: (abs(s-x), -s))   # nearest, ties round up
    return best
# only true spacing rhythm: margin / padding / gap. Not top/left/inset (positional), not border/radius.
PROP = re.compile(r'(?<![\w-])((?:margin|padding)(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?|gap|row-gap|column-gap)(\s*:\s*)([^;{}]+)', re.I)
NUM  = re.compile(r'(-?)(\d*\.?\d+)px')
dry = '--apply' not in sys.argv
changes = collections.Counter(); files_touched = 0; total = 0
for f in sorted(glob.glob('**/*.css', recursive=True)):
    src = io.open(f, encoding='utf-8').read()
    # protect comments from edits
    comments = []
    def hide(m):
        comments.append(m.group(0)); return '\x00%d\x00' % (len(comments)-1)
    body = re.sub(r'/\*.*?\*/', hide, src, flags=re.S)
    n = 0
    def fixprop(m):
        global n
        def fixnum(mm):
            global n
            sign, val = mm.group(1), float(mm.group(2))
            s = snap(val)
            if s == val: return mm.group(0)
            n += 1; changes['%g->%g' % (val, s)] += 1
            return '%s%gpx' % (sign, s)
        return m.group(1) + m.group(2) + NUM.sub(fixnum, m.group(3))
    body = PROP.sub(fixprop, body)
    body = re.sub(r'\x00(\d+)\x00', lambda m: comments[int(m.group(1))], body)
    if n:
        files_touched += 1; total += n
        if not dry: io.open(f,'w',encoding='utf-8',newline='\n').write(body)
print(('APPLIED' if not dry else 'DRY RUN') + ': %d values in %d files' % (total, files_touched))
print('\ntop substitutions:')
for k,v in changes.most_common(18): print('   %-12s %4d' % (k+'px', v))
