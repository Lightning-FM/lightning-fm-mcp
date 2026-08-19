// Lightning FM — Artist profile resolution
// Fetches kind 0 (NIP-01 metadata) events for artist pubkeys.
// Mirrors station-server/src/catalog/profiles.ts.

import WebSocket from 'ws';
import { nip19 } from 'nostr-tools';
import { config } from '../config.js';
import { log } from '../log.js';

export interface ArtistProfile {
  pubkey: string;
  displayName: string;
  name?: string;
  picture?: string;
  lud16?: string;
  nip05?: string;
  createdAt: number;
}

// Fetch kind 0 profiles for a set of pubkeys from relays.
// Returns a map of pubkey -> ArtistProfile.
export async function fetchProfiles(pubkeys: string[]): Promise<Map<string, ArtistProfile>> {
  if (pubkeys.length === 0) return new Map();

  const profiles = new Map<string, ArtistProfile>();

  const results = await Promise.allSettled(
    config.nostrRelays.map(relay => fetchProfilesFromRelay(relay, pubkeys))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const [pk, profile] of result.value) {
        const existing = profiles.get(pk);
        if (!existing || profile.createdAt > existing.createdAt) {
          profiles.set(pk, profile);
        }
      }
    }
  }

  return profiles;
}

function fetchProfilesFromRelay(relayUrl: string, pubkeys: string[]): Promise<Map<string, ArtistProfile>> {
  return new Promise((resolve) => {
    const profiles = new Map<string, ArtistProfile>();
    const ws = new WebSocket(relayUrl);
    const subId = 'profiles-' + Math.random().toString(36).slice(2, 8);
    const timeout = setTimeout(() => { ws.close(); resolve(profiles); }, config.fetchTimeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify(['REQ', subId, { kinds: [0], authors: pubkeys, limit: pubkeys.length }]));
    });

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === 'EVENT' && msg[1] === subId) {
          const event = msg[2];
          const content = JSON.parse(event.content);
          const incoming: ArtistProfile = {
            pubkey: event.pubkey,
            displayName: content.display_name || content.name || event.pubkey.slice(0, 8) + '...',
            name: content.name,
            picture: content.picture,
            lud16: content.lud16,
            nip05: content.nip05,
            createdAt: event.created_at,
          };
          const prev = profiles.get(event.pubkey);
          if (!prev || incoming.createdAt > prev.createdAt) {
            profiles.set(event.pubkey, incoming);
          }
        }
        if (msg[0] === 'EOSE') {
          clearTimeout(timeout);
          ws.close();
          resolve(profiles);
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      log.warn('profiles: relay error %s: %s', relayUrl, (err as Error).message);
      resolve(profiles);
    });
  });
}

// Accepts a raw hex pubkey or an npub and returns hex, or null if neither.
export function resolvePubkey(input: string): string | null {
  const trimmed = input.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (trimmed.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === 'npub') return decoded.data;
    } catch {
      return null;
    }
  }
  return null;
}
