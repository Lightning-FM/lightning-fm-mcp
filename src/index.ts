#!/usr/bin/env node
// Lightning FM MCP Server — Entry Point
//
// Wraps the same Nostr relay and Blossom surfaces Lightning FM itself
// runs on. There is no separate agent API and no data this server can
// see that a human client couldn't also see by querying the same relays —
// deliberately, per protocol:agent_queryable_music_knowledge_graph's
// surviving principle: "don't build a separate agent API."

import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { config } from './config.js';
import { log } from './log.js';

// Read the version from package.json rather than repeating it here. It was
// hardcoded once and silently drifted three releases behind, so clients saw
// 0.1.0 while npm served 0.1.3. Resolved at runtime from dist/, one level
// below the package root.
const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const server = new McpServer({ name: 'lightning-fm', version });
registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info('ready — relays: %s, blossom: %s', config.nostrRelays.join(', '), config.blossomUrl);
}

main().catch(err => {
  log.error('fatal: %s', (err as Error).stack ?? String(err));
  process.exit(1);
});
