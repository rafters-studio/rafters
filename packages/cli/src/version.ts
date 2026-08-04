/**
 * The CLI's own version.
 *
 * Read at runtime from the package's own package.json rather than injected at
 * build time. `import.meta.url` resolves to `<pkg>/src/version.ts` when running
 * from source and `<pkg>/dist/index.js` once tsup has bundled this module into
 * the single entry -- one level up from either is the same package.json, and
 * npm always ships package.json regardless of the `files` list. A build-time
 * define would leave the source path (which is what vitest runs) reporting a
 * placeholder, so the test could not cover what consumers actually execute.
 *
 * A hardcoded version string is what made `rafters --version` report 0.0.1 for
 * every published build, which is why nobody could tell a stale binary from a
 * broken registry.
 */

import { readFileSync } from 'node:fs';

/** Reported when package.json cannot be read or carries no version string. */
const UNKNOWN_VERSION = '0.0.0-unknown';

function readVersion(): string {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
    );
    if (parsed !== null && typeof parsed === 'object' && 'version' in parsed) {
      const { version } = parsed as { version: unknown };
      if (typeof version === 'string' && version.length > 0) return version;
    }
  } catch {
    // Unreadable or malformed -- fall through. Reporting an unknown version is
    // survivable; crashing `rafters mcp` at startup is not.
  }
  return UNKNOWN_VERSION;
}

export const VERSION = readVersion();
