import io

# 1. the mock card fields: stop a browser or password manager offering a real card to a form with nothing behind it
p = 'showcase/parts/phone-pay.html'
s = io.open(p, encoding='utf-8').read()
OPT = ' autocomplete="off" data-1p-ignore data-lpignore="true" data-form-type="other"'
for old, new in [
    ('<input id="payCardNo" type="text" inputmode="numeric" autocomplete="cc-number" maxlength="23" spellcheck="false">',
     '<input id="payCardNo" type="text" inputmode="numeric"' + OPT + ' maxlength="23" spellcheck="false">'),
    ('<input id="payCardExp" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" maxlength="7" spellcheck="false">',
     '<input id="payCardExp" type="text" inputmode="numeric"' + OPT + ' placeholder="MM / YY" maxlength="7" spellcheck="false">'),
    ('<input id="payCardCvc" type="text" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" maxlength="4" spellcheck="false">',
     '<input id="payCardCvc" type="text" inputmode="numeric"' + OPT + ' placeholder="CVC" maxlength="4" spellcheck="false">'),
]:
    assert old in s, old[:60]
    s = s.replace(old, new)
s = s.replace('<div class="pay-newcard m-glass" id="payNewCard" hidden>',
              '<!-- the card fields are a drawing of a checkout, not one: nothing is sent anywhere. The autocomplete and\n             password-manager opt-outs are there so no browser offers a real card to a form with nothing behind it, and\n             pay.js clears them on the way out. -->\n        <div class="pay-newcard m-glass" id="payNewCard" hidden>')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('phone-pay.html: card fields opted out of autofill')

# 2. the typed number does not outlive the checkout
p = 'showcase/pay.js'
s = io.open(p, encoding='utf-8').read()
old = "  // leaving the checkout takes the sheet with it\n  document.addEventListener('mpage', (e) => { if (e.detail && e.detail.from === 'checkout' && e.detail.page !== 'checkout') ssClose(true) })"
new = ("  // leaving the checkout takes the sheet with it, and the card fields with that: whatever was typed there is gone\n"
       "  // the moment the page changes, rather than sitting in the DOM for the rest of the visit\n"
       "  document.addEventListener('mpage', (e) => {\n"
       "    if (!(e.detail && e.detail.from === 'checkout' && e.detail.page !== 'checkout')) return\n"
       "    ssClose(true)\n"
       "    for (const id of ['payCardNo', 'payCardExp', 'payCardCvc']) { const f = $(id); if (f) { f.value = ''; f.removeAttribute('aria-invalid') } }\n"
       "    const err = $('payCardError'); if (err) { err.textContent = ''; err.hidden = true }\n"
       "  })")
assert old in s
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('pay.js: card fields cleared on leaving checkout')

# 3. inherited Object keys must not pass a lookup guard
p = 'showcase/app.js'
s = io.open(p, encoding='utf-8').read()
old = '    if (saved && DEFAULTS[saved.variant]) {'
new = '    // a key like "constructor" is truthy on any plain object, so the guard has to ask for an own property\n    if (saved && Object.hasOwn(DEFAULTS, String(saved.variant))) {'
assert old in s
s = s.replace(old, new)
old2 = "logo: LOGOS[saved.logo] ? saved.logo : 'fist',"
new2 = "logo: Object.hasOwn(LOGOS, String(saved.logo)) ? saved.logo : 'fist',"
assert old2 in s
s = s.replace(old2, new2)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('app.js: own-property guards on the saved variant and logo')

p = 'showcase/mobile.js'
s = io.open(p, encoding='utf-8').read()
old = "  if (!EMBED) go(pages[st.page] && st.page !== 'punch' ? st.page : 'default')"
new = ("  // pages is a plain object, so \"constructor\" or \"toString\" would pass a bare lookup and take the app nowhere\n"
       "  if (!EMBED) go(Object.hasOwn(pages, String(st.page)) && st.page !== 'punch' ? st.page : 'default')")
assert old in s
s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('mobile.js: own-property guard on the saved page')
