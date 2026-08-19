// Tests for kind 31337 parsing (src/nostr/track.ts).
// Run: npx tsx --test tests/*.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrackEvent } from '../src/nostr/track.js';

function baseEvent(overrides: Partial<{ tags: string[][]; content: string }> = {}) {
  return {
    id: 'e'.repeat(64),
    pubkey: 'p'.repeat(64),
    created_at: 1_700_000_000,
    tags: overrides.tags ?? [['title', 'Test Track'], ['d', 'test-track']],
    content: overrides.content ?? '',
  };
}

describe('parseTrackEvent', () => {
  it('returns null when the required title tag is missing', () => {
    const event = baseEvent({ tags: [['d', 'no-title']] });
    assert.equal(parseTrackEvent(event), null);
  });

  it('parses required and optional tags into a TrackInfo', () => {
    const event = baseEvent({
      tags: [
        ['title', 'No Cocaine'],
        ['d', 'no-cocaine'],
        ['url', 'https://audio.example/no-cocaine.mp3'],
        ['x', 'deadbeef'.repeat(8)],
        ['duration', '285'],
        ['genre', 'reggae'],
        ['t', 'ganja'],
        ['t', 'summer'],
        ['track_number', '3'],
        ['explicit', 'true'],
      ],
      content: 'lyrics here',
    });

    const track = parseTrackEvent(event);
    assert.ok(track);
    assert.equal(track!.title, 'No Cocaine');
    assert.equal(track!.slug, 'no-cocaine');
    assert.equal(track!.audioUrl, 'https://audio.example/no-cocaine.mp3');
    assert.equal(track!.audioHash, 'deadbeef'.repeat(8));
    assert.equal(track!.durationSecs, 285);
    assert.equal(track!.genre, 'reggae');
    assert.deepEqual(track!.tags, ['ganja', 'summer']);
    assert.equal(track!.trackNumber, 3);
    assert.equal(track!.explicit, true);
    assert.equal(track!.description, 'lyrics here');
  });

  it('leaves optional fields undefined when tags are absent', () => {
    const track = parseTrackEvent(baseEvent());
    assert.ok(track);
    assert.equal(track!.audioUrl, undefined);
    assert.equal(track!.explicit, undefined);
    assert.equal(track!.tags, undefined);
    assert.equal(track!.description, undefined);
  });

  it('trims empty event content to undefined', () => {
    const track = parseTrackEvent(baseEvent({ content: '   ' }));
    assert.equal(track!.description, undefined);
  });
});
