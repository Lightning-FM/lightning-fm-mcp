#!/usr/bin/env python3
"""Survey what is actually published under Nostr kind 31337 on public relays.

Purpose: staab's review comment on nips PR #2442 says kind 31337 "has had a
lot of divergent adoption with not a lot of spec work". This quantifies that
claim so the PR can cite evidence instead of assertion, and so outreach has a
real target list rather than whatever happened to surface by accident.

Deliberately conservative: reports what tags events actually carry, and
separates "looks like music" from "uses the kind for something else" with a
stated heuristic rather than an assumption.
"""
import json
import sys
from collections import Counter, defaultdict

# Tag sets that identify our own dialect and the two competing definitions,
# per insight:lfm_31337_private_dialect. registry-of-kinds requires
# d/type/media; the closed PR #1043 draft used d/title/imeta.
REGISTRY_CORE = {"d", "type", "media"}
PR1043_CORE = {"d", "title", "imeta"}
LFM_CORE = {"d", "title", "url", "x"}

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
            if ev.get("kind") != 31337 or "id" not in ev:
                continue
            events[ev["id"]] = ev  # dedupe across relays by event id
    return list(events.values())


def tagset(ev):
    return {t[0] for t in ev.get("tags", []) if t}


def first(ev, name):
    for t in ev.get("tags", []):
        if t and t[0] == name and len(t) > 1:
            return t[1]
    return None


def looks_like_audio(ev):
    """Heuristic, stated so it can be argued with: an event is plausibly a
    music track if it names a title AND points at a file somehow."""
    tags = tagset(ev)
    if not first(ev, "title") and not first(ev, "subject"):
        return False
    return bool(tags & AUDIO_HINT_TAGS)


def main(path):
    events = load(path)
    print(f"# kind 31337 corpus survey")
    print(f"\nunique events (deduped by id across relays): {len(events)}")

    by_pubkey = defaultdict(list)
    for ev in events:
        by_pubkey[ev["pubkey"]].append(ev)
    print(f"distinct pubkeys: {len(by_pubkey)}")

    audio = [e for e in events if looks_like_audio(e)]
    print(f"plausibly music (title/subject + a file-ish tag): {len(audio)}"
          f"  ({100*len(audio)//max(len(events),1)}%)")
    print(f"everything else: {len(events)-len(audio)}")

    # --- The single most useful signal: NIP-89 client tags name the app ---
    print("\n## NIP-89 `client` tags (names the publishing app)")
    clients = Counter()
    client_pubkeys = defaultdict(set)
    for ev in events:
        for t in ev.get("tags", []):
            if t and t[0] == "client" and len(t) > 1:
                clients[t[1]] += 1
                client_pubkeys[t[1]].add(ev["pubkey"])
    if clients:
        for name, n in clients.most_common():
            print(f"  {n:5d} events  {len(client_pubkeys[name]):3d} pubkeys  {name}")
    else:
        print("  (none found)")
    tagged = sum(clients.values())
    print(f"  events carrying a client tag: {tagged}/{len(events)}"
          f" ({100*tagged//max(len(events),1)}%)")

    # --- Tag vocabulary ---
    print("\n## Tag vocabulary across all events")
    tagcount = Counter()
    for ev in events:
        for name in tagset(ev):
            tagcount[name] += 1
    for name, n in tagcount.most_common(30):
        print(f"  {n:5d} ({100*n//max(len(events),1):3d}%)  {name}")

    # --- Dialect clustering: group pubkeys by their tag signature ---
    print("\n## Dialects (distinct tag signatures, music-ish events only)")
    sig_pubkeys = defaultdict(set)
    sig_events = Counter()
    for ev in audio:
        sig = tuple(sorted(tagset(ev)))
        sig_pubkeys[sig].add(ev["pubkey"])
        sig_events[sig] += 1
    print(f"distinct tag signatures among music-ish events: {len(sig_pubkeys)}")
    print("\ntop signatures:")
    for sig, n in sig_events.most_common(12):
        print(f"\n  {n:4d} events / {len(sig_pubkeys[sig])} pubkeys")
        print(f"    tags: {', '.join(sig)}")

    # --- Conformance to each competing definition ---
    print("\n## Conformance of music-ish events to each competing definition")
    reg = sum(1 for e in audio if REGISTRY_CORE <= tagset(e))
    pr = sum(1 for e in audio if PR1043_CORE <= tagset(e))
    lfm = sum(1 for e in audio if LFM_CORE <= tagset(e))
    tot = max(len(audio), 1)
    print(f"  registry-of-kinds core (d,type,media): {reg}/{len(audio)} ({100*reg//tot}%)")
    print(f"  PR #1043 draft core (d,title,imeta):   {pr}/{len(audio)} ({100*pr//tot}%)")
    print(f"  LFM/PR2442 core (d,title,url,x):       {lfm}/{len(audio)} ({100*lfm//tot}%)")
    none_of = sum(1 for e in audio if not (REGISTRY_CORE <= tagset(e)
                                           or PR1043_CORE <= tagset(e)
                                           or LFM_CORE <= tagset(e)))
    print(f"  conforms to NONE of the three:          {none_of}/{len(audio)} ({100*none_of//tot}%)")

    # --- Publisher leaderboard among music-ish events ---
    print("\n## Top music-ish publishers (candidate outreach targets)")
    audio_by_pk = defaultdict(list)
    for ev in audio:
        audio_by_pk[ev["pubkey"]].append(ev)
    ranked = sorted(audio_by_pk.items(), key=lambda kv: -len(kv[1]))
    for pk, evs in ranked[:20]:
        cl = {first(e, "client") for e in evs} - {None}
        urls = [first(e, "url") or first(e, "media") for e in evs]
        host = ""
        for u in urls:
            if u and "//" in u:
                host = u.split("//", 1)[1].split("/", 1)[0]
                break
        sigs = {tuple(sorted(tagset(e))) for e in evs}
        print(f"  {len(evs):4d}  {pk[:16]}…  host={host or '-'}"
              f"  client={','.join(cl) if cl else '-'}  sigs={len(sigs)}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "all-raw.jsonl")
