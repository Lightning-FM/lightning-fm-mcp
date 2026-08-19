#!/usr/bin/env node
// Lightning FM MCP Server — Entry Point
//
// Wraps the same Nostr relay and Blossom surfaces Lightning FM itself
// runs on. There is no separate agent API and no data this server can
// see that a human client couldn't also see by querying the same relays —
// deliberately, per protocol:agent_queryable_music_knowledge_graph's
// surviving principle: "don't build a separate agent API."

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { config } from './config.js';
import { log } from './log.js';

const server = new McpServer({ name: 'lightning-fm', version: '0.1.0' });
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
