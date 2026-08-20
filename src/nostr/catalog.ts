// Lightning FM — one-shot catalog fetch with a short in-process cache.
//
// Unlike station-server's Catalog class (persistent subscription, feeds a
// live audio pipeline), this is a stateless MCP server: each tool call
// fetches or reuses a recent snapshot. No live subscription — an agent
// asking "what's on the station" doesn't need sub-second freshness.

import WebSocket from 'ws';
import { verifyEvent } from 'nostr-tools/pure';
import { parseTrackEvent, type TrackInfo } from './track.js';
import { config } from '../config.js';
import { log } from '../log.js';

const KIND_TRACK = 31337;

// Addressable events (NIP-01) are identified by (kind, pubkey, d-tag) — the
// d-tag alone is not unique across pubkeys. Deduping by slug alone would let
// a second artist (or a stranger, on a relay without a write allowlist)
// collide with an existing d-tag and silently replace that track's audioUrl
// if their event had a later created_at. Always key by pubkey + slug.
export function trackKey(track: TrackInfo): string {
  return `${track.artistPubkey}:${track.slug || track.eventId}`;
}

let cache: { tracks: TrackInfo[]; fetchedAt: number } | null = null;

export async function getCatalog(): Promise<TrackInfo[]> {
  if (cache && Date.now() - cache.fetchedAt < config.cacheTtlMs) {
    return cache.tracks;
  }

  const byKey = new Map<string, TrackInfo>();
  const results = await Promise.allSettled(
    config.nostrRelays.map(relay => fetchFromRelay(relay))
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const track of result.value) {
      const key = trackKey(track);
      const existing = byKey.get(key);
      // Addressable events: keep the most recent version.
      if (!existing || track.createdAt > existing.createdAt) {
        byKey.set(key, track);
      }
    }
  }

  const tracks = Array.from(byKey.values());
  cache = { tracks, fetchedAt: Date.now() };
  log.info('catalog: %d tracks from %d relays', tracks.length, config.nostrRelays.length);
  return tracks;
}

function fetchFromRelay(relayUrl: string): Promise<TrackInfo[]> {
  return new Promise((resolve) => {
    const tracks: TrackInfo[] = [];
    const ws = new WebSocket(relayUrl, {
      headers: { 'User-Agent': config.userAgent },
    });
    const subId = 'catalog-' + Math.random().toString(36).slice(2, 8);
    const timeout = setTimeout(() => { ws.close(); resolve(tracks); }, config.fetchTimeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify(['REQ', subId, { kinds: [KIND_TRACK], limit: 500 }]));
    });

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          if (!verifyEvent(msg[2])) {
            log.warn('catalog: skipping event with invalid signature: %s from %s', msg[2]?.id, relayUrl);
            return;
          }
          const track = parseTrackEvent(msg[2]);
          if (track) tracks.push(track);
        }
        if (msg[0] === 'EOSE') {
          clearTimeout(timeout);
          ws.close();
          resolve(tracks);
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      log.warn('catalog: relay error %s: %s', relayUrl, (err as Error).message);
      resolve(tracks);
    });
  });
}
