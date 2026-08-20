#!/usr/bin/env node
// Keep server.json's version in lockstep with package.json.
//
// npm and the MCP registry are two separate publishes, and skipping the
// second one is silent: npm serves the new version while the registry keeps
// serving the old one and nobody is told. That is exactly what happened to
// 0.1.4 — published to npm, never to the registry, discovered only when
// 0.1.5 went out and the registry was still advertising 0.1.3.
//
// Wired into package.json as:
//   version         -> rewrites server.json during `npm version`
//   prepublishOnly  -> --check refuses to publish if they ever disagree
//
// Run with --check to verify without writing.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = join(root, "package.json");
const srvPath = join(root, "server.json");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const srv = JSON.parse(readFileSync(srvPath, "utf8"));
const want = pkg.version;

const found = [srv.version, ...(srv.packages ?? []).map((p) => p.version)];
const drifted = found.filter((v) => v !== want);

if (process.argv.includes("--check")) {
  if (drifted.length) {
    console.error(
      `server.json is out of sync: package.json is ${want}, server.json has ` +
        `${[...new Set(drifted)].join(", ")}.\n` +
        `Run: node scripts/sync-server-json.mjs`,
    );
    process.exit(1);
  }
  // The npm package identifier must match mcpName or the registry rejects the
  // publish outright. Cheap to check here rather than after a failed upload.
  const npmPkg = (srv.packages ?? []).find((p) => p.registryType === "npm");
  if (npmPkg && npmPkg.identifier !== pkg.name) {
    console.error(`server.json npm identifier ${npmPkg.identifier} != package name ${pkg.name}`);
    process.exit(1);
  }
  if (srv.name !== pkg.mcpName) {
    console.error(`server.json name ${srv.name} != package.json mcpName ${pkg.mcpName}`);
    process.exit(1);
  }
  console.log(`server.json in sync at ${want}`);
  process.exit(0);
}

if (!drifted.length) {
  console.log(`server.json already at ${want}`);
  process.exit(0);
}

srv.version = want;
for (const p of srv.packages ?? []) p.version = want;
writeFileSync(srvPath, JSON.stringify(srv, null, 2) + "\n");
console.log(`server.json -> ${want}`);
