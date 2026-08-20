#!/usr/bin/env node
// Push the just-published npm version to the MCP registry.
//
// Runs automatically as npm's `postpublish`, because the failure mode this
// guards is forgetting — 0.1.4 reached npm and never reached the registry,
// and nothing complained for two releases.
//
// If this fails (usually an expired DNS login) it exits non-zero and says
// exactly what to run. npm has already published at that point, so a loud
// failure here is the whole point: it is the only signal that the two are
// out of step.

import { execFileSync } from "node:child_process";

try {
  execFileSync("mcp-publisher", ["publish"], { stdio: "inherit" });
} catch {
  console.error(
    "\nMCP registry publish FAILED. npm is published; the registry is not.\n" +
      "Agents discovering via the registry will keep getting the old version.\n\n" +
      "Re-auth and retry:\n" +
      "  KEY=$(op item get 3acqjhruv6kmzb575kbr5ntfei --vault 'Ephemeral Empire' --fields credential --reveal)\n" +
      "  mcp-publisher login dns --domain lightning.fm --private-key \"$KEY\"\n" +
      "  mcp-publisher publish\n",
  );
  process.exit(1);
}
