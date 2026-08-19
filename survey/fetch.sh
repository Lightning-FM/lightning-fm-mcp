#!/usr/bin/env bash
# Fetch a kind-31337 corpus from several public relays.
# nak should close on EOSE but some relays keep the socket open, so each
# call gets a hard perl-alarm timeout.
cd "$(dirname "$0")"

timeout_run() { perl -e 'alarm shift; exec @ARGV' "$@"; }

RELAYS="nos.lol relay.damus.io relay.primal.net relay.nostr.band offchain.pub nostr.mom"

for r in $RELAYS; do
  out="raw-${r}.jsonl"
  timeout_run 25 nak req -k 31337 -l 500 "wss://$r" > "$out" 2>/dev/null
  printf '%s %s\n' "$(wc -l < "$out" | tr -d ' ')" "$r"
done

cat raw-*.jsonl > all-raw.jsonl
echo "TOTAL RAW: $(wc -l < all-raw.jsonl | tr -d ' ')"
echo FETCH_DONE
