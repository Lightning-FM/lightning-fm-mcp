#!/usr/bin/env python3
"""Drill into the dominant kind-31337 music dialects and name who publishes them."""
import json
import sys
from collections import Counter, defaultdict

AUDIO_HINT_TAGS = {"url", "media", "imeta", "x", "duration", "m"}


def load(path):
    events = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            if ev.get("kind") == 31337 and "id" in ev:
                events[ev["id"]] = ev
    return list(events.values())


def tagset(ev):
    return {t[0] for t in ev.get("tags", []) if t}


def first(ev, name):
    for t in ev.get("tags", []):
        if t and t[0] == name and len(t) > 1:
            return t[1]
    return None


def looks_like_audio(ev):
    if not first(ev, "title") and not first(ev, "subject"):
        return False
    return bool(tagset(ev) & AUDIO_HINT_TAGS)


events = load(sys.argv[1] if len(sys.argv) > 1 else "all-raw.jsonl")
audio = [e for e in events if looks_like_audio(e)]

TARGET = ("c", "cover", "d", "media", "p", "subject")
print("## Dominant dialect: tags =", ", ".join(TARGET))
print("   (this is the single largest music cluster)\n")
members = [e for e in audio if tuple(sorted(tagset(e))) == TARGET]
pks = defaultdict(list)
for e in members:
    pks[e["pubkey"]].append(e)
for pk, evs in sorted(pks.items(), key=lambda kv: -len(kv[1])):
    sample = evs[0]
    media = first(sample, "media") or ""
    host = media.split("//", 1)[1].split("/", 1)[0] if "//" in media else "-"
    print(f"  {len(evs):3d} events  {pk[:16]}…  host={host}")
    print(f"        subject={first(sample,'subject')!r} c={first(sample,'c')!r}")

print("\n## Every distinct `client` tag value with its pubkeys and a sample")
byclient = defaultdict(list)
for e in events:
    c = first(e, "client")
    if c:
        byclient[c].append(e)
for c, evs in sorted(byclient.items(), key=lambda kv: -len(kv[1])):
    pubkeys = {e["pubkey"] for e in evs}
    print(f"\n  === {c} === {len(evs)} events, {len(pubkeys)} pubkeys")
    for t in evs[0].get("tags", []):
        if t and t[0] == "client":
            print(f"      raw client tag: {t}")
            break
    s = evs[0]
    print(f"      sample tags: {sorted(tagset(s))}")
    print(f"      title={first(s,'title')!r} subject={first(s,'subject')!r}")
    for pk in list(pubkeys)[:4]:
        print(f"      pubkey: {pk}")

print("\n## Media hosts across all music-ish events (who is actually serving audio)")
hosts = Counter()
for e in audio:
    u = first(e, "media") or first(e, "url") or ""
    if "//" in u:
        hosts[u.split("//", 1)[1].split("/", 1)[0]] += 1
for h, n in hosts.most_common(20):
    print(f"  {n:4d}  {h}")
