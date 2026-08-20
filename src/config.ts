import { createRequire } from 'node:module';

// Resolved at runtime from dist/, one level below the package root — same
// pattern as index.ts, so the advertised version can't drift from npm.
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

// Read-only config. No secrets: this server never signs or publishes,
// it only fetches from public relays and the public Blossom server. Env
// vars come from the MCP client's server config (e.g. claude_desktop_config.json's
// "env" block) — not a local .env file, since this runs via `npx` from an
// arbitrary directory.
export const config = {
  // Kind 31337 is a shared NIP registry kind, not exclusive to Lightning
  // FM — querying it against an unrestricted public relay returns every
  // other app's and every stranger's kind-31337 events too, not just ours.
  // relay.lightning.fm enforces an allowlist on writes (only onboarded
  // artists can publish there), so it's the only relay safe to trust
  // without an authors filter. Same reasoning covers kind 30311 (now
  // playing) below. Don't add a public relay here.
  nostrRelays: (process.env.LFM_NOSTR_RELAYS || 'wss://relay.lightning.fm')
    .split(',').map(s => s.trim()).filter(Boolean),

  blossomUrl: process.env.LFM_BLOSSOM_URL || 'https://media.lightning.fm',

  // How long a fetched catalog/profile/now-playing snapshot is reused
  // before the next tool call triggers a fresh relay round-trip.
  cacheTtlMs: parseInt(process.env.LFM_CACHE_TTL_MS || '60000', 10),

  // Identify ourselves on outbound relay connections. This is the software
  // naming itself: name and version, byte-identical for every install, with
  // no identifier and nothing about you in it. It is deliberately not
  // telemetry — nothing is reported back to Lightning FM, and `ws` would
  // send its own default User-Agent here regardless. It exists so we can
  // tell agent catalog queries apart from browser traffic in our own relay
  // logs. Anything unique per install belongs nowhere near this string.
  userAgent: `lightning-fm-mcp/${version}`,

  fetchTimeoutMs: 10_000,
};
