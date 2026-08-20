// Lightning FM — NIP-53 live activity lookup.
// Reads the kind 30311 addressable event station-server publishes on every
// track change (station-server/src/nostr/publisher.ts). Read-only mirror
// of its D_TAG and tag layout — keep the two in sync.

import WebSocket from 'ws';
import { config } from '../config.js';
import { log } from '../log.js';

const KIND_LIVE_ACTIVITY = 30311;
const D_TAG = 'lightning-fm-station';

export interface NowPlaying {
  status: string;
  current?: string;
  streamingUrl?: string;
  currentArtistPubkey?: string;
  title?: string;
  summary?: string;
  updatedAt: number;
}

export async function getNowPlaying(): Promise<NowPlaying | null> {
  const results = await Promise.allSettled(
    config.nostrRelays.map(relay => fetchFromRelay(relay))
  );

  let best: NowPlaying | null = null;
  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    if (!best || result.value.updatedAt > best.updatedAt) best = result.value;
  }
  return best;
}

function fetchFromRelay(relayUrl: string): Promise<NowPlaying | null> {
  return new Promise((resolve) => {
    let latest: NowPlaying | null = null;
    const ws = new WebSocket(relayUrl, {
      headers: { 'User-Agent': config.userAgent },
    });
    const subId = 'now-playing-' + Math.random().toString(36).slice(2, 8);
    const timeout = setTimeout(() => { ws.close(); resolve(latest); }, config.fetchTimeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify(['REQ', subId, { kinds: [KIND_LIVE_ACTIVITY], '#d': [D_TAG], limit: 1 }]));
    });

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          const event = msg[2];
          const getTag = (name: string) => (event.tags as string[][]).find(t => t[0] === name)?.[1];
          const parsed: NowPlaying = {
            status: getTag('status') || 'unknown',
            current: getTag('current'),
            streamingUrl: getTag('streaming'),
            currentArtistPubkey: (event.tags as string[][]).find(t => t[0] === 'p' && t[3] === 'artist')?.[1],
            title: getTag('title'),
            summary: getTag('summary'),
            updatedAt: event.created_at,
          };
          if (!latest || parsed.updatedAt > latest.updatedAt) latest = parsed;
        }
        if (msg[0] === 'EOSE') {
          clearTimeout(timeout);
          ws.close();
          resolve(latest);
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      log.warn('now-playing: relay error %s: %s', relayUrl, (err as Error).message);
      resolve(latest);
    });
  });
}
