import re

def blocks(s):
    out = []
    for m in re.finditer(r'<div class="var [^"]*" data-name="([^"]+)">', s):
        i = m.start(); depth = 0; j = i
        while True:
            k = re.compile(r'<div\b|</div>').search(s, j)
            if k.group(0) == '<div': depth += 1
            else:
                depth -= 1
                if depth == 0: j = k.end(); break
            j = k.end()
        out.append((m.group(1), i, j))
    return out

def _span(s, i, j):
    start = s.rfind('\n', 0, i)
    pre = s.rfind('\n', 0, start)
    line = s[pre + 1:start].strip() if pre >= 0 else ''
    if line.startswith('<!--') and line.endswith('-->'): start = pre
    return start, j

def cut(path, names):
    s = open(path, encoding='utf8').read()
    for n in names:
        bs = [b for b in blocks(s) if b[0] == n]
        if not bs: print('  MISSING', n, path); continue
        _, i, j = bs[0]
        a, b = _span(s, i, j)
        s = s[:a] + s[b:]
        print('  cut', n)
    open(path, 'w', encoding='utf8', newline='').write(s)

def first(path, name):
    s = open(path, encoding='utf8').read()
    bs = [b for b in blocks(s) if b[0] == name]
    if not bs: print('  MISSING', name, path); return
    _, i, j = bs[0]
    a, b = _span(s, i, j)
    block = s[a:b].lstrip('\n')
    s = (s[:a] + s[b:]).lstrip('\n')
    open(path, 'w', encoding='utf8', newline='').write(block + '\n' + s)
    print('  first', name)
