import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCatalog } from './nostr/catalog.js';
import { fetchProfiles, resolvePubkey, type ArtistProfile } from './nostr/profiles.js';
import { getNowPlaying } from './nostr/now-playing.js';
import { config } from './config.js';
import type { TrackInfo } from './nostr/track.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// Prefer the artist's direct URL; fall back to Blossom by content hash,
// same resolution order station-server's audio fetcher uses.
function resolveAudioUrl(track: TrackInfo): string | undefined {
  if (track.audioUrl) return track.audioUrl;
  if (track.audioHash) return `${config.blossomUrl}/${track.audioHash}`;
  return undefined;
}

function trackSummary(track: TrackInfo, artist: ArtistProfile | undefined) {
  return {
    title: track.title,
    artist: artist?.displayName ?? track.artistPubkey.slice(0, 8) + '...',
    artistPubkey: track.artistPubkey,
    album: track.album,
    genre: track.genre,
    year: track.year,
    trackNumber: track.trackNumber,
    durationSecs: track.durationSecs,
    tags: track.tags,
    explicit: track.explicit,
    isrc: track.isrc,
    credits: track.credits,
    description: track.description,
    audioUrl: resolveAudioUrl(track),
    imageUrl: track.imageUrl,
    streamable: Boolean(resolveAudioUrl(track)),
    eventId: track.eventId,
    publishedAt: new Date(track.createdAt * 1000).toISOString(),
  };
}

async function withArtistNames(tracks: TrackInfo[]): Promise<Map<string, ArtistProfile>> {
  const pubkeys = [...new Set(tracks.map(t => t.artistPubkey))];
  return fetchProfiles(pubkeys);
}

function jsonResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    'search_catalog',
    {
      title: 'Search Lightning FM catalog',
      description:
        "Search or browse Lightning FM's Nostr-native music catalog (kind 31337 track events, fetched live from " +
        config.nostrRelays.join(', ') +
        '). Every result is signed by the artist\'s own Nostr key — this is the canonical catalog, not a curated ' +
        'subset. Leave all filters empty to browse the whole catalog, newest first.',
      inputSchema: {
        query: z.string().optional()
          .describe('Free-text match against title, artist name, album, genre, and description.'),
        genre: z.string().optional().describe('Exact or partial genre match, case-insensitive.'),
        tag: z.string().optional().describe('Match a single free-form keyword tag.'),
        limit: z.number().int().min(1).max(MAX_LIMIT).optional()
          .describe(`Max tracks to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`),
      },
    },
    async ({ query, genre, tag, limit }) => {
      const tracks = await getCatalog();
      const artists = await withArtistNames(tracks);

      const q = query?.trim().toLowerCase();
      const g = genre?.trim().toLowerCase();
      const t = tag?.trim().toLowerCase();

      const filtered = tracks.filter(track => {
        if (g && !track.genre?.toLowerCase().includes(g)) return false;
        if (t && !track.tags?.some(x => x.toLowerCase() === t)) return false;
        if (q) {
          const artistName = artists.get(track.artistPubkey)?.displayName ?? '';
          const haystack = [track.title, artistName, track.album, track.genre, track.description]
            .filter(Boolean).join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      });

      filtered.sort((a, b) => b.createdAt - a.createdAt);
      const page = filtered.slice(0, limit ?? DEFAULT_LIMIT);

      return jsonResult({
        totalMatches: filtered.length,
        returned: page.length,
        tracks: page.map(track => trackSummary(track, artists.get(track.artistPubkey))),
      });
    }
  );

  server.registerTool(
    'get_artist',
    {
      title: 'Look up a Lightning FM artist',
      description:
        'Look up an artist by display name or Nostr pubkey (hex or npub) and return their profile plus every ' +
        'track they have published to Lightning FM.',
      inputSchema: {
        artist: z.string().describe('Artist display name (partial match ok), hex pubkey, or npub.'),
      },
    },
    async ({ artist }) => {
      const tracks = await getCatalog();
      const pubkeyInput = resolvePubkey(artist);

      let matchedPubkey: string | undefined = pubkeyInput ?? undefined;

      if (!matchedPubkey) {
        const candidatePubkeys = [...new Set(tracks.map(t => t.artistPubkey))];
        const profiles = await fetchProfiles(candidatePubkeys);
        const needle = artist.trim().toLowerCase();
        for (const [pk, profile] of profiles) {
          const name = (profile.displayName || profile.name || '').toLowerCase();
          if (name === needle || name.includes(needle)) {
            matchedPubkey = pk;
            break;
          }
        }
      }

      if (!matchedPubkey) {
        return jsonResult({ found: false, message: `No artist found matching "${artist}".` });
      }

      const profiles = await fetchProfiles([matchedPubkey]);
      const profile = profiles.get(matchedPubkey);
      const artistTracks = tracks
        .filter(t => t.artistPubkey === matchedPubkey)
        .sort((a, b) => b.createdAt - a.createdAt);

      return jsonResult({
        found: true,
        pubkey: matchedPubkey,
        displayName: profile?.displayName,
        nip05: profile?.nip05,
        lightningAddress: profile?.lud16,
        picture: profile?.picture,
        trackCount: artistTracks.length,
        tracks: artistTracks.map(track => trackSummary(track, profile)),
      });
    }
  );

  server.registerTool(
    'get_now_playing',
    {
      title: "What's playing on Lightning FM right now",
      description:
        'Read the current live activity (NIP-53, kind 30311) Lightning FM publishes on every track change: ' +
        'the track currently on air, the stream URL, and station status.',
      inputSchema: {},
    },
    async () => {
      const nowPlaying = await getNowPlaying();
      if (!nowPlaying) {
        return jsonResult({ live: false, message: 'No live activity event found on the configured relays.' });
      }
      return jsonResult({
        live: nowPlaying.status === 'live',
        status: nowPlaying.status,
        current: nowPlaying.current,
        streamingUrl: nowPlaying.streamingUrl,
        currentArtistPubkey: nowPlaying.currentArtistPubkey,
        updatedAt: new Date(nowPlaying.updatedAt * 1000).toISOString(),
      });
    }
  );
}
