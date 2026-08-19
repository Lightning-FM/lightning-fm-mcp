// Deliberately stderr-only, no logging library.
//
// This server talks JSON-RPC over stdin/stdout (StdioServerTransport). Any
// stray write to stdout — including a logger that defaults to it, like pino
// does — corrupts the protocol stream and breaks the connection silently
// from the client's point of view. console.error always goes to stderr,
// which the MCP client treats as free-form diagnostic output.
function write(level: string, msg: string, ...args: unknown[]): void {
  console.error(`[lightning-fm-mcp] ${level}: ${msg}`, ...args);
}

export const log = {
  info: (msg: string, ...args: unknown[]) => write('info', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => write('warn', msg, ...args),
  error: (msg: string, ...args: unknown[]) => write('error', msg, ...args),
};
