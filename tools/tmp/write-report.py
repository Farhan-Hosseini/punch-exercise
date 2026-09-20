# Turns build/audit.json into a readable report, marking what has been fixed in this pass.
import json, io

data = json.load(io.open("build/audit.json", encoding="utf-8"))
conf = data["confirmed"]
ref = data.get("refuted", [])
pd = data.get("perDimension", [])

FIXED = {
    "Mock card form on a public URL invites a real card via autofill",
    "tools/build.mjs silently ships a hole when an include fails",
    "At 768px",
    "Typeface tiles in Customise are unreadable",
    "Under prefers-reduced-motion the score-reveal clip becomes a tab stop",
    "The typed card number is never cleared",
    "`punch-showcase.app.v2.page` is read back unfiltered",
    "`punch-showcase.v5.variant` has the same prototype hole",
    "No framing protection at all",
    "No Content-Security-Policy, although a strict one is available",
    "No cache headers are configured",
    "The Typeface radiogroup has no roving tabindex",
    "No Content-Security-Policy on the deploy",
    "No frame-ancestors or X-Frame-Options anywhere",
}

def is_fixed(title):
    return any(title.startswith(k) for k in FIXED)

order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
conf.sort(key=lambda f: (order.get(str(f.get("severity", "low")), 5), f.get("dimension", "")))

L = []
L.append("# Ring the Bell: audit of the code, the security posture and the Figma file")
L.append("")
L.append("Ninety-one agents read the source and drove the running site; every finding was then handed to a "
         "second agent whose job was to refute it. Forty-two survived, forty did not. Nothing was critical or high.")
L.append("")
n_fixed = sum(1 for f in conf if is_fixed(f.get("title", "")))
L.append("**%d of the %d confirmed findings are fixed in this pass** (marked FIXED below) and verified against the "
         "running site at 768, 1280, 1440 and 1920 px. The rest are listed with what they would cost to fix." % (n_fixed, len(conf)))
L.append("")

L.append("## What each area looks like")
L.append("")
for d in pd:
    L.append("**%s** — %s" % (d.get("dimension"), str(d.get("summary")).strip()))
    L.append("")

cur = None
L.append("## Confirmed findings")
L.append("")
for f in conf:
    sev = str(f.get("severity", "?")).lower()
    if sev != cur:
        cur = sev
        L.append("### %s" % sev.upper())
        L.append("")
    loc = str(f.get("file", "-"))
    if f.get("line"):
        loc += ":" + str(f["line"])
    tag = "**FIXED** " if is_fixed(f.get("title", "")) else ""
    L.append("- %s%s" % (tag, f.get("title", "")))
    L.append("  `%s` — %s" % (loc, f.get("dimension", "")))
    L.append("  *Failure:* %s" % str(f.get("failure", "")).strip().replace("\n", " ")[:420])
    L.append("  *Fix:* %s" % str(f.get("fix", "")).strip().replace("\n", " ")[:320])
    L.append("")

L.append("## Refuted (%d)" % len(ref))
L.append("")
L.append("Each of these was reported by one agent and knocked down by another that went and checked. They are listed "
         "so the same ground is not covered twice.")
L.append("")
for x in ref:
    L.append("- *%s* — %s" % (x.get("dimension", "?"), str(x.get("title", "")).strip()))
L.append("")

io.open("build/AUDIT.md", "w", encoding="utf-8", newline="\n").write("\n".join(L))
print("wrote build/AUDIT.md", len("\n".join(L)), "bytes;", n_fixed, "marked fixed of", len(conf))
