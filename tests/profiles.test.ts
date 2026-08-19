// Tests for src/nostr/profiles.ts's pure helper (resolvePubkey).
// Run: npx tsx --test tests/*.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import { nip19 } from 'nostr-tools';
import { resolvePubkey } from '../src/nostr/profiles.js';

describe('resolvePubkey', () => {
  it('accepts a raw lowercase hex pubkey', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    assert.equal(resolvePubkey(pk), pk);
  });

  it('accepts an uppercase hex pubkey and lowercases it', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    assert.equal(resolvePubkey(pk.toUpperCase()), pk);
  });

  it('decodes an npub to hex', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const npub = nip19.npubEncode(pk);
    assert.equal(resolvePubkey(npub), pk);
  });

  it('returns null for garbage input', () => {
    assert.equal(resolvePubkey('sprinkles'), null);
    assert.equal(resolvePubkey('nsec1notanpub'), null);
    assert.equal(resolvePubkey(''), null);
  });

  it('returns null for a well-formed nsec (not a pubkey)', () => {
    const sk = generateSecretKey();
    const dummy = finalizeEvent({ kind: 1, created_at: 0, tags: [], content: '' }, sk);
    // sanity: signing works, but nsec input still shouldn't resolve as a pubkey
    assert.ok(dummy.id);
    const nsec = nip19.nsecEncode(sk);
    assert.equal(resolvePubkey(nsec), null);
  });
});
