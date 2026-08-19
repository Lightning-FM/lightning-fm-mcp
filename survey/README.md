# What kind 31337 actually carries: a relay survey

Backing data for a comment on [nostr-protocol/nips#2442](https://github.com/nostr-protocol/nips/pull/2442).

The context: kind 31337 has been used for audio tracks for years without a
merged NIP. Reviewing the closed [#1043](https://github.com/nostr-protocol/nips/pull/1043),
staab wrote that this kind "has had a lot of divergent adoption with not a lot
of spec work." That is a claim worth measuring rather than repeating, so this
measures it.

Findings are in [FINDINGS.md](./FINDINGS.md). Headline: of 859 unique kind-31337
events across six relays, about 11% are audio at all, and among those there are
24 distinct tag signatures with roughly 91% matching none of the three competing
definitions.

## Reproduce it

Requires [`nak`](https://github.com/fiatjaf/nak) and Python 3.

```sh
./fetch.sh          # pull kind 31337 from six public relays
python3 analyze.py  # corpus stats, tag vocabulary, dialect clustering, conformance
python3 dialects.py # drill into the dominant dialects and the NIP-89 client tags
./handlers.sh       # NIP-89 handlers declaring 31337 and adjacent audio kinds
python3 adjacent.py # what actually occupies 31338 / 31339 / 32123
./verify36787.sh    # the same treatment for kind 36787
```

Every script is a few dozen lines and does nothing clever. The point is that
the numbers should be checkable by someone who does not trust us.

## About the data in `data/`

Gzipped JSONL snapshots taken **2026-08-19**, kept because relay contents drift
and a dispute six months from now should be able to check our arithmetic against
the corpus we actually used, not a different one.

Re-running `fetch.sh` will **not** reproduce these figures exactly, and that is
expected. Relays expire events, rate-limit differently, and accept new ones. The
method reproduces; the exact counts do not.

## Known limits

- **"Plausibly audio" is a heuristic**, not ground truth: an event counts if it
  has a `title` or `subject` tag and some file-pointing tag (`url`, `media`,
  `imeta`, `x`, `duration`, `m`). It is stated in `analyze.py` so it can be
  argued with. A different heuristic moves the 11% figure.
- **Relay choice biases everything.** Six relays is not the network. Relays with
  different retention or spam policies would give different ratios.
- **`limit: 500` per relay** means large relays are sampled, not enumerated.
- **NIP-89 `client` tags appear on only ~3% of events**, so the table naming
  which apps use the kind is a sample of a sample. It is suggestive, not a census.
- Conformance is measured against *required-tag cores* only, so an event can
  count as conforming while differing everywhere else.

## License

MIT, same as the rest of this repository. Use the data, dispute the numbers.
