# Kind 31337 in the wild: empirical survey (2026-08-19)

Method: `nak req -k 31337 -l 500` against nos.lol, relay.damus.io,
relay.primal.net, relay.nostr.band, offchain.pub, nostr.mom. Deduped by
event id. 859 unique events, 288 distinct pubkeys. Plus NIP-89 handler
(31990) sweep and adjacent-kind sweeps (31338 / 31339 / 32123).

Reproduce: `fetch.sh`, then `analyze.py`, `dialects.py`, `adjacent.py`.

Caveat on the "music" split below: the heuristic is "has a title or
subject tag AND some file-pointing tag". It is stated so it can be
argued with, not treated as ground truth.

## Headline numbers (evidence for staab's "divergent adoption" claim)

- 859 events, 288 pubkeys. Only **98 (11%) are plausibly audio at all.**
  Kind 31337 is overwhelmingly not music.
- Among those 98 audio-ish events: **24 distinct tag signatures.**
- **91% of audio-ish events conform to none** of the three competing
  definitions (registry-of-kinds literal `d/type/media`; PR #1043 draft
  `d/title/imeta`; our PR #2442 `d/title/url/x`).
  - registry-of-kinds literal core: 0%
  - PR #1043 core: 7%
  - PR #2442 core: 1%

That is the divergence, quantified. It is worth putting in the PR.

## What kind 31337 is actually used for (NIP-89 `client` tags)

Only 3% of events carry a client tag, but the ones that do are damning:

| client | events | what it actually is (from its tags) |
|---|---|---|
| tetra | 11 | board game — `board`, `score`, `a` |
| Fanfares | 7 | **paid audio** — `imeta`, `price`, `zap`, `encrypted`, `referral` |
| ClawMobile iOS/Android | 5 | not audio — `client`, `p`, `t` only |
| MiniPod | 1 | audio/podcast — `url`, `x`, `m`, `size`, `duration`, `waveform` |
| Relay Outpost | 1 | music-ish — `artist`, `media`, `url`, `subject`, `title` |
| Iron Ledger | 1 | **fitness tracker** — `workout`, `intensity`, `streak` |
| Stegstr Android | 1 | steganography — `d`, `m`, `x`, `t` |

A board game, a fitness tracker and a steganography app share this kind
with music. This is the strongest single argument that the kind needs
spec work, and it is checkable by anyone.

## The dominant audio dialect is podcasts, not music

Largest audio cluster: `d + subject + media + cover` (+ `c` category,
`p` participant) — 49 events across 20 pubkeys. Its `c` values:

`Podcast` 33, `Hip Hop` 4, `Other` 4, `Electronic` 2, `Rock` 2, `Country` 1

So two thirds of the dominant audio dialect is **podcast episodes**, on
the kind our PR treats as music tracks. This vocabulary is essentially
the registry-of-kinds definition with `c` substituted for `type` and `p`
for `participant` — which is why the literal registry-core conformance
scored 0% while a near-variant dominates.

## Implementers: NIP-89 handlers declaring kind 31337

Four, total:

1. **Lightning FM** (us) — `31337`, `30402`.
2. **Zapstr** — zapstr.live, "Music app on Nostr", declares `0` + `31337`.
   The only other *dedicated music app* declaring the kind. Top target.
3. **Amethyst** — amethyst.social, generic Android client, declares ~70
   kinds including 31337. Would render whatever the spec says.
4. **snort** — snort.social, generic web client, same situation.

**Fanfares** (fanfares.io) does not appear in this handler sweep but is
the most active *structured* publisher found, on both 31337 and 31339.
Real shipping product: nip05 `official@team.fanfares.io`, lud16
`fanfares@rizful.com`, "Sell your content for sats... New PWA now in
Early Access". Directly comparable business model to Lightning FM.

## Two problems this surfaces in our own PR #2442

Worth raising ourselves rather than being told later.

**1. Kind 31339 (our proposed "releases") is already occupied.**
342 events / 87 pubkeys, including:
- Fanfares: 25 events, paid content, priced up to 8000 sats. Their
  31337 is audio and their 31339 is a *different content type* (not
  releases/albums) — the `a` tag points at their own handler, not at
  track refs.
- `ajedrez-web` (a chess app): 9 events
- `tetra` (the board game): 4 events
- AI agent digests (`digest-2026-08-19-midday`, `agentdex-profile`)

**2. Kind 31338 is not podcast episodes in the wild.** Our draft leaves
31338 as podcast episodes per the closed #1043 draft. Actual 31338
traffic (300 events / 218 pubkeys) is dominated by `d+v` and `d+p`
pairs plus `app`, `hash`, `witnesses`, `status`, `ref` — app state and
attestations, not podcasts.

## Also noted

Kind **32123**: 498 events but 496 are `d`-only stubs. The 2 real ones
come from client `v4v` with a genuinely rich audio dialect —
`split`, `creator`, `waveform`, `blossom`, `imeta`, `x`, `duration`,
`published_at`, `zap`. Payment splits in the tag vocabulary. Low volume,
but the closest thing found to a well-designed audio dialect.

## THE BURIED LEDE: kind 36787 is where music actually converged

Found by independently checking a subagent's claim. It holds up, and it
reframes the whole task.

`nak req -k 36787` across the same relays: **624 unique events, 218
pubkeys, 8 distinct named clients** — more real music than kind 31337
carries in total.

| client | events |
|---|---|
| nostria | 75 |
| Amethyst | 37 |
| gruuv | 26 |
| sunami.app | 14 |
| indiesats | 4 |
| nostr-music.shakespeare.wtf | 2 |
| nodecast.xyz | 2 |
| nostr.blue | 1 |

And unlike 31337, the vocabulary is **converged**, not fragmented:

`title` 100%, `url` 99%, `d` 99%, `duration` 99%, `alt` 99%, `artist`
99%, `t` 96%, `image` 95%, `album` 86%, `track_number` 78%, `released`
78%, `format` 76%, `size` 74%, `m` 72%, `x` 72%, `fallback` 69%,
`bitrate` 68%, `genre` 64%.

### We already speak this dialect

**13 of the 18 core tags are identical to Lightning FM's own vocabulary:**
`album, d, duration, fallback, genre, image, m, size, t, title,
track_number, url, x`

- 36787 core we do **not** publish (5, all trivially addable):
  `alt, artist, bitrate, format, released`
- We publish that 36787 core lacks (6 — and this is exactly our value-add):
  `credits, explicit, isrc, lightning_node_id, preview, year`

We independently converged on nearly the same schema as the rest of the
ecosystem. We are on the wrong *number*, not the wrong *design*.

### The release layer is unbuilt and unclaimed

The "Nostr Music" NIP-89 handler (nostr-music.shakespeare.wtf) declares
kinds **34139 + 36787**. 36787 has 624 events. **34139 has ZERO events
in the wild.** The release/album layer is declared and empty.

That is precisely the gap PR #2442 fills: releases as first-class
addressable events with ordered track refs, contributor/credit modeling,
ISRC, and the payment hook.

### And there is still no spec

66 distinct tag signatures across those 624 events. The core is stable
at ~99% but the edges are ad hoc. That is convention without
formalization — exactly what a NIP is for, and exactly the "not a lot of
spec work" staab named.

## What the 36787 corpus actually contains (checked before recommending it)

Two tests, both run because a "go where the adoption is" recommendation
deserves them.

**Is it one publisher mirroring a catalog? No.** 218 distinct pubkeys;
top publisher is 14% of events, top-10 is 52%. Genuinely multi-source.
Supply side is real too: nostria has 14 distinct pubkeys publishing
through it, Amethyst 11. Not a read-only ecosystem.

**But the tail is thin.** 185 of 218 pubkeys published *exactly one*
event. Only 19 pubkeys have 5 or more. So it is "many people tried it
once", not "many catalogs live here".

**And a quarter of it is unlicensed major-label music.** Matching artist
tags against a deliberately conservative list of 10 well-known acts:
**158 of 624 events (25%)** — N.W.A, Radiohead, Pixies, Megadeth,
Beastie Boys, Daft Punk, Kanye West (including two versions of a track
titled "HEIL HITLER"). The audio is hosted on public Blossom servers,
mostly `blossom.primal.net`. A further 26 events just point at
open.spotify.com URLs rather than a file.

- **Verified:** the artist tags name those acts, and the `url` tags
  resolve to Blossom hosts.
- **Inferred (strongly, not proven):** those files are the actual
  copyrighted recordings. Confirming would mean downloading and
  listening, which is not worth doing.

This matters for Lightning FM specifically. We host files, run a relay,
and issue names — we are an operator, not a neutral pipe. Adopting a
kind whose corpus is a quarter unlicensed majors puts our catalog
surface, and anything our MCP server indexes, adjacent to that. For a
platform positioned on exit rights and legitimate direct payment, and
actively recruiting independent artists, that adjacency is a real cost.

## Strategic read

Revised after the corpus checks above. The earlier read ("go where the
adoption is, switch to 36787") does not survive them.

**Do not switch kinds.** 36787's adoption is 85% one-off publishers and
at least a quarter unlicensed major-label uploads. It is equally
unratified — never submitted to the NIPs repo — so migrating buys
adjacency to a pirate corpus and loses our own publishing history, for
no legitimacy gain.

**Do absorb its vocabulary.** Adding `alt`, `artist`, `bitrate`,
`format`, `released` to our events costs nothing and makes them parse
unmodified in nostria, Amethyst, Ditto and nostr.blue. That is real
interop for near-zero effort, and it is the genuinely valuable finding
here: we and they independently converged on the same 13 core tags.

**Drop 31339 for the release kind.** Indefensible: Fanfares, a chess
app, the tetra board game, AI agent digests, *and* Wavlake's
`DRAFT_TRACK_KIND = 31339`. Worse, PR #2225 shows staab told the
agent-profile authors to move off 31337 and they picked 31339 — our own
predecessor PR pushed them onto the number we now want. Pick clean.

**The survey is itself the contribution.** staab's stated objection is
that this kind has had "not a lot of spec work". This is spec work he
can verify in one command.

## Target shortlist

On 36787 (where the adoption is):
1. **nostria** — highest-volume client (75 events).
2. **Amethyst** — Vitor Pamplona; already declares 31337 *and* publishes
   36787. The single highest-leverage contact in Nostr client-land.
3. **gruuv**, **sunami.app**, **indiesats**, **nodecast.xyz**,
   **nostr.blue**, **nostr-music.shakespeare.wtf** (owns the empty 34139).

On 31337 (legacy, still worth informing):
4. **Zapstr** — only other dedicated music app declaring 31337 by NIP-89.
5. **Fanfares** — most active structured publisher, closest business
   model to ours, and its 31339 usage collides with our proposal.
