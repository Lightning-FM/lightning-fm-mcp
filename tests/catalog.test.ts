// Regression test for a real bug: the catalog used to dedup tracks by
// d-tag (slug) alone. NIP-01 addressable events are identified by
// (kind, pubkey, d) — d alone is not unique across pubkeys. A second
// artist (or a stranger, on a relay without a write allowlist) could
// collide with an existing d-tag and silently replace that track's
// audioUrl if their event had a later created_at. trackKey() must
// include the pubkey.
//
// Run: npx tsx --test tests/*.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { trackKey } from '../src/nostr/catalog.js';
import type { TrackInfo } from '../src/nostr/track.js';

describe('trackKey — addressable event identity', () => {
  it('keys by pubkey + slug, not slug alone', () => {
    const trackA: TrackInfo = {
      eventId: 'a'.repeat(64),
      artistPubkey: 'artist-a',
      title: 'Original',
      slug: 'same-slug',
      createdAt: 1000,
    };
    const trackB: TrackInfo = {
      eventId: 'b'.repeat(64),
      artistPubkey: 'artist-b',
      title: 'Impersonator',
      slug: 'same-slug',
      createdAt: 2000, // later timestamp — would win under the old bug
    };

    assert.notEqual(trackKey(trackA), trackKey(trackB));

    const tracks = new Map<string, TrackInfo>();
    for (const t of [trackA, trackB]) {
      const key = trackKey(t);
      const existing = tracks.get(key);
      if (!existing || t.createdAt > existing.createdAt) tracks.set(key, t);
    }
    assert.equal(tracks.size, 2);
    assert.equal(tracks.get(trackKey(trackA))!.title, 'Original');
    assert.equal(tracks.get(trackKey(trackB))!.title, 'Impersonator');
  });

  it('still dedups the same artist republishing the same slug, keeping the latest', () => {
    const v1: TrackInfo = {
      eventId: 'a'.repeat(64),
      artistPubkey: 'artist-a',
      title: 'v1',
      slug: 'my-track',
      createdAt: 1000,
    };
    const v2: TrackInfo = {
      eventId: 'c'.repeat(64),
      artistPubkey: 'artist-a',
      title: 'v2',
      slug: 'my-track',
      createdAt: 2000,
    };

    assert.equal(trackKey(v1), trackKey(v2));

    const tracks = new Map<string, TrackInfo>();
    for (const t of [v1, v2]) {
      const key = trackKey(t);
      const existing = tracks.get(key);
      if (!existing || t.createdAt > existing.createdAt) tracks.set(key, t);
    }
    assert.equal(tracks.size, 1);
    assert.equal(tracks.get(trackKey(v1))!.title, 'v2');
  });

  it('falls back to eventId when slug is empty, still scoped by pubkey', () => {
    const track: TrackInfo = {
      eventId: 'e'.repeat(64),
      artistPubkey: 'artist-a',
      title: 'No slug',
      slug: '',
      createdAt: 1000,
    };
    assert.equal(trackKey(track), `artist-a:${'e'.repeat(64)}`);
  });
});
