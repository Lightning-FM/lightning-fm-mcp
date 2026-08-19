#!/usr/bin/env python3
"""What actually lives on the adjacent kinds: 31338, 31339, 32123.

Matters because PR #2442 claims 31339 for releases and treats 31338 as
podcast episodes. If those numbers are already occupied in the wild, the
proposal has a collision problem it hasn't acknowledged.
"""
import glob
import json
from collections import Counter, defaultdict


def load(path):
    out = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            if "id" in ev:
                out[ev["id"]] = ev
    return list(out.values())


def first(ev, name):
    for t in ev.get("tags", []):
        if t and t[0] == name and len(t) > 1:
            return t[1]
    return None


for kind in (31338, 31339, 32123):
    files = glob.glob(f"events-kind-{kind}.jsonl")
    if not files:
        continue
    events = load(files[0])
    print(f"\n{'='*66}\n## kind {kind}: {len(events)} unique events,"
          f" {len({e['pubkey'] for e in events})} pubkeys")

    tagc = Counter()
    for ev in events:
        for t in {t[0] for t in ev.get("tags", []) if t}:
            tagc[t] += 1
    print("  top tags:", ", ".join(f"{k}({v})" for k, v in tagc.most_common(12)))

    clients = Counter()
    for ev in events:
        c = first(ev, "client")
        if c:
            clients[c] += 1
    print("  client tags:", dict(clients.most_common(8)) or "(none)")

    sigs = Counter()
    for ev in events:
        sigs[tuple(sorted({t[0] for t in ev.get("tags", []) if t}))] += 1
    print(f"  distinct tag signatures: {len(sigs)}")
    for sig, n in sigs.most_common(3):
        print(f"    {n:4d}x  {', '.join(sig)}")

    print("  samples:")
    for ev in events[:5]:
        title = first(ev, "title") or first(ev, "subject") or first(ev, "name") or "-"
        print(f"    {ev['pubkey'][:12]}…  title={title!r:45.45}"
              f" d={str(first(ev,'d'))[:24]!r}")
