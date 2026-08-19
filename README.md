# Lightning FM :: MCP Server

An [MCP](https://modelcontextprotocol.io) server for [Lightning FM](https://lightning.fm)'s music catalog — search tracks, look up artists, and check what's live on the station, all from an agent.

There is no separate agent API. This server reads exactly what a human client reads: kind 31337 track events and kind 0 profiles from public Nostr relays, audio and images from the public Blossom server, and the kind 30311 live activity event the station publishes on every track change. Every track is signed by the artist's own key — this is the canonical catalog, not a curated subset the platform maintains for agents.

## Use it

Add it to your MCP client's server config. For Claude Code or Claude Desktop:

```json
{
  "mcpServers": {
    "lightning-fm": {
      "command": "npx",
      "args": ["-y", "lightning-fm-mcp"]
    }
  }
}
```

No install, no API key, no account. It talks to `relay.lightning.fm` and `media.lightning.fm` by default — see [Configuration](#configuration) to point it elsewhere.

## Tools

- **`search_catalog`** — free-text search plus genre/tag filters over the full catalog. Leave every filter empty to browse newest-first.
- **`get_artist`** — look up an artist by display name (partial match), hex pubkey, or npub. Returns their profile and full discography.
- **`get_now_playing`** — what's currently on air, and the stream URL.

## Configuration

All environment variables are optional — defaults point at production. Nothing here is a secret; this server is read-only and never signs or publishes anything.

| Variable | Default | What it does |
|---|---|---|
| `LFM_NOSTR_RELAYS` | `wss://relay.lightning.fm` | Comma-separated relay URLs to query. Only add a relay here if it gates writes the way relay.lightning.fm does — kind 31337 isn't exclusive to Lightning FM, and an unrestricted public relay hands back every other app's tracks too. |
| `LFM_BLOSSOM_URL` | `https://media.lightning.fm` | Blossom server audio/image hashes resolve against. |
| `LFM_CACHE_TTL_MS` | `60000` | How long a fetched snapshot is reused before the next tool call re-queries the relays. |

## Development

```sh
npm install
npm run dev     # runs src/index.ts directly via tsx
npm run build   # tsc -> dist/
```

`src/nostr/track.ts` mirrors the kind 31337 parsing in `station-server/src/catalog/track.ts` (private repo) and [`app-desktop/src-tauri/src/relay.rs`](https://github.com/Lightning-FM/lightning-fm-desktop/blob/main/src-tauri/src/relay.rs). All three must agree on tag names — this is the platform's public wire format, documented in full at [lightning.fm/interop](https://lightning.fm/interop).

## License

MIT
