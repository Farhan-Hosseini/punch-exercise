import io
p = 'tools/build.mjs'
s = io.open(p, encoding='utf-8').read()
old = """      if (inc.startsWith(ROOT)) {
        try {
          parts[i] = await readFile(inc, 'utf8')
        } catch {
          parts[i] = `<!-- missing ${parts[i]} -->`
        }
      } else {
        parts[i] = ''
      }"""
new = """      if (!inc.startsWith(ROOT)) throw new Error(`include escapes the showcase folder: ${parts[i]}`)
      // a part that cannot be read used to become an HTML comment and the build still exited 0, so a deploy could
      // go out with a hole in the page and Netlify would call it green
      parts[i] = await readFile(inc, 'utf8')"""
assert old in s
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('build.mjs: a missing include now fails the build')
