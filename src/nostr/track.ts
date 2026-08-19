// Lightning FM — Track metadata type
//
// Third implementation of the kind 31337 contract, alongside
// station-server/src/catalog/track.ts and app-desktop/src-tauri/src/relay.rs.
// All three must agree on tag names. If you change one, change all three.

export interface TrackInfo {
  eventId: string;
  artistPubkey: string;
  title: string;
  slug: string;
  durationSecs?: number;
  audioHash?: string;
  audioUrl?: string;
  fallbackUrl?: string;
  mimeType?: string;
  fileSize?: number;
  lightningNodeId?: string;
  imageUrl?: string;
  createdAt: number;
  album?: string;
  genre?: string;
  year?: string;
  trackNumber?: number;
  /** Nostr `t` tags — free-form keywords. */
  tags?: string[];
  credits?: string;
  isrc?: string;
  explicit?: boolean;
  /** Event content — the artist's description. */
  description?: string;
}

// Parse a kind 31337 Nostr event into a TrackInfo.
export function parseTrackEvent(event: {
  id: string;
  pubkey: string;
  tags: string[][];
  created_at: number;
  content?: string;
}): TrackInfo | null {
  const getTag = (name: string): string | undefined => {
    const tag = event.tags.find(t => t[0] === name);
    return tag?.[1];
  };

  const title = getTag('title');
  if (!title) return null; // title is required

  const hashtags = event.tags
    .filter(t => t[0] === 't' && t[1])
    .map(t => t[1]);
  const trackNumber = getTag('track_number');

  return {
    eventId: event.id,
    artistPubkey: event.pubkey,
    title,
    slug: getTag('d') || '',
    durationSecs: getTag('duration') ? parseInt(getTag('duration')!, 10) : undefined,
    audioHash: getTag('x'),
    audioUrl: getTag('url'),
    fallbackUrl: getTag('fallback'),
    mimeType: getTag('m'),
    fileSize: getTag('size') ? parseInt(getTag('size')!, 10) : undefined,
    lightningNodeId: getTag('lightning_node_id'),
    imageUrl: getTag('image'),
    createdAt: event.created_at,
    album: getTag('album'),
    genre: getTag('genre'),
    year: getTag('year'),
    trackNumber: trackNumber ? parseInt(trackNumber, 10) : undefined,
    tags: hashtags.length > 0 ? hashtags : undefined,
    credits: getTag('credits'),
    isrc: getTag('isrc'),
    explicit: getTag('explicit') === 'true' || undefined,
    description: event.content?.trim() || undefined,
  };
}
