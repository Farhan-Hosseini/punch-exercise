import re

def _end(s, i, tag='div'):
    depth = 0; j = i
    pat = re.compile(r'<%s\b|</%s>' % (tag, tag))
    while True:
        k = pat.search(s, j)
        if not k: raise SystemExit('unbalanced at %d' % i)
        if k.group(0).startswith('</'):
            depth -= 1
            if depth == 0: return k.end()
        else: depth += 1
        j = k.end()

def find(s, name):
    m = re.search(r'<(\w+)[^>]*\sdata-sv="%s"[^>]*>' % re.escape(name), s)
    return m

def cut(path, names):
    s = open(path, encoding='utf8').read()
    for n in names:
        m = find(s, n)
        if not m: print('  MISSING', n, path); continue
        tag = m.group(1)
        j = _end(s, m.start(), tag)
        a = s.rfind('\n', 0, m.start())
        pre = s.rfind('\n', 0, a)
        line = s[pre + 1:a].strip() if pre >= 0 else ''
        if line.startswith('<!--') and line.endswith('-->'): a = pre
        s = s[:a] + s[j:]
        print('  cut', n)
    open(path, 'w', encoding='utf8', newline='').write(s)

def first(path, name):
    """move a design to the front of its section, so it is the one the screen opens on"""
    s = open(path, encoding='utf8').read()
    m = find(s, name)
    if not m: print('  MISSING', name, path); return
    tag = m.group(1)
    j = _end(s, m.start(), tag)
    a = s.rfind('\n', 0, m.start())
    pre = s.rfind('\n', 0, a)
    line = s[pre + 1:a].strip() if pre >= 0 else ''
    if line.startswith('<!--') and line.endswith('-->'): a = pre
    block = s[a:j]
    rest = s[:a] + s[j:]
    # the section this design sat in: put the block right after its opening tag
    sec = rest.rfind('data-sec=', 0, a)
    ins = rest.index('>', sec) + 1
    s = rest[:ins] + block + rest[ins:]
    open(path, 'w', encoding='utf8', newline='').write(s)
    print('  first', name)
