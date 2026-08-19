#!/usr/bin/env bash
# NIP-89 handler events (kind 31990) that declare support for kind 31337.
# These are apps self-declaring "I handle this kind" — the closest thing to
# an authoritative implementer registry that exists.
cd "$(dirname "$0")"
timeout_run() { perl -e 'alarm shift; exec @ARGV' "$@"; }

RELAYS="wss://nos.lol wss://relay.damus.io wss://relay.primal.net wss://relay.nostr.band wss://purplepag.es"

# handlers declaring kind 31337
timeout_run 30 nak req -k 31990 -t k=31337 -l 200 $RELAYS > handlers-31337.jsonl 2>/dev/null
echo "31337 handlers: $(wc -l < handlers-31337.jsonl | tr -d ' ')"

# adjacent audio kinds the ecosystem might have moved to
for k in 31338 31339 32123 1063; do
  timeout_run 25 nak req -k 31990 -t "k=$k" -l 100 $RELAYS > "handlers-$k.jsonl" 2>/dev/null
  echo "$k handlers: $(wc -l < "handlers-$k.jsonl" | tr -d ' ')"
done

# also: how much traffic do the adjacent audio kinds actually carry?
for k in 31338 31339 32123; do
  timeout_run 25 nak req -k "$k" -l 300 $RELAYS > "events-kind-$k.jsonl" 2>/dev/null
  echo "kind $k events: $(wc -l < "events-kind-$k.jsonl" | tr -d ' ')"
done
echo HANDLERS_DONE
