"""Analyze vercel env ls --json for duplicate name+environment entries."""
import json
import sys
from collections import defaultdict

raw = sys.stdin.read()
start = raw.find("{")
if start < 0:
    start = raw.find("[")
decoder = json.JSONDecoder()
data, _ = decoder.raw_decode(raw, start)
items = data if isinstance(data, list) else data.get("envs", data.get("variables", []))

by_key: dict[tuple[str, str], list[dict]] = defaultdict(list)
for e in items:
    key = e.get("key") or e.get("name")
    targets = e.get("target") or e.get("targets") or []
    if isinstance(targets, str):
        targets = [targets]
    eid = e.get("id", "?")
    created = e.get("createdAt") or e.get("created") or "?"
    for t in targets:
        by_key[(key, t)].append({"id": eid, "created": created})

print("DUPLICATES (same name + environment):")
found = False
for (key, env), entries in sorted(by_key.items()):
    if len(entries) > 1:
        found = True
        print(f"{key} [{env}] x{len(entries)}")
        for ent in entries:
            print(f"  id={ent['id']} created={ent['created']}")
if not found:
    print("none")

print("\nALL ENTRIES:")
for e in sorted(items, key=lambda x: (x.get("key") or x.get("name"), str(x.get("target")))):
    key = e.get("key") or e.get("name")
    targets = e.get("target") or e.get("targets")
    eid = e.get("id", "?")
    created = e.get("createdAt") or e.get("created") or "?"
    print(f"{key} | {targets} | {eid} | {created}")
