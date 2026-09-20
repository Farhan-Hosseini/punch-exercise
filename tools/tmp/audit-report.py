# Pulls the structured result out of the audit workflow's output file and prints it as a ranked list.
import json, io, sys

P = r"C:\Users\FARHAN~1\AppData\Local\Temp\claude\C--Claude-Database\98de7949-3980-4190-a703-419fb7335679\tasks\w2bj4i2zn.output"
top = json.load(io.open(P, encoding="utf-8", errors="replace"))

data = None
for key in ("result", "output", "value"):
    v = top.get(key)
    if isinstance(v, dict) and "confirmed" in v:
        data = v
        break
    if isinstance(v, str) and '"confirmed"' in v:
        data = json.loads(v)
        break
if data is None:
    def walk(o):
        if isinstance(o, dict):
            if "confirmed" in o and isinstance(o["confirmed"], list):
                return o
            for x in o.values():
                r = walk(x)
                if r:
                    return r
        elif isinstance(o, list):
            for x in o:
                r = walk(x)
                if r:
                    return r
        return None
    data = walk(top)
if data is None:
    sys.exit("could not find the confirmed list; top keys: %s" % list(top))

conf = data["confirmed"]
ref = data.get("refuted", [])
pd = data.get("perDimension", [])
order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
conf.sort(key=lambda f: order.get(str(f.get("severity", "low")), 5))

print("CONFIRMED %d   REFUTED %d" % (len(conf), len(ref)))
print()
for f in conf:
    sev = str(f.get("severity", "?")).upper()
    loc = str(f.get("file", "-"))
    if f.get("line"):
        loc += ":" + str(f["line"])
    print("[%-8s] %-11s %s" % (sev, f.get("dimension", "?"), loc))
    print("             " + str(f.get("title", "")))
print()
print("--- per dimension ---")
for d in pd:
    print("%-11s found %2d  %s" % (d.get("dimension"), d.get("found", 0), str(d.get("summary"))[:170]))
print()
print("--- refuted ---")
for x in ref:
    print("  %-11s %s" % (x.get("dimension", "?"), str(x.get("title", ""))[:96]))

json.dump(data, io.open("build/audit.json", "w", encoding="utf-8"), indent=1)
print()
print("saved build/audit.json")
