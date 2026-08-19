#!/usr/bin/env bash
# Independently verify the claim that kind 36787 is where the Nostr music
# ecosystem has actually converged. Do not take the subagent's word for it.
cd "$(dirname "$0")"
timeout_run() { perl -e 'alarm shift; exec @ARGV' "$@"; }
R="wss://nos.lol wss://relay.damus.io wss://relay.primal.net wss://relay.nostr.band wss://purplepag.es wss://nostr.mom"

timeout_run 30 nak req -k 36787 -l 500 $R > events-kind-36787.jsonl 2>/dev/null
echo "kind 36787 events: $(wc -l < events-kind-36787.jsonl | tr -d ' ')"

timeout_run 25 nak req -k 31990 -t k=36787 -l 100 $R > handlers-36787.jsonl 2>/dev/null
echo "36787 NIP-89 handlers: $(wc -l < handlers-36787.jsonl | tr -d ' ')"

# Wavlake's claimed draft/album block
for k in 31340 30440 30441 30442 30443; do
  timeout_run 20 nak req -k "$k" -l 100 $R > "events-kind-$k.jsonl" 2>/dev/null
  echo "kind $k events: $(wc -l < "events-kind-$k.jsonl" | tr -d ' ')"
done
echo VERIFY_DONE
