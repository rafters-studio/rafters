/**
 * rafters agents
 *
 * Writes or updates the rafters agent-contract block in AGENTS.md for
 * non-Claude-Code agent hosts. The contract body is generated from the live
 * MCP tool surface (see mcp/agent-contract.ts) -- the same content the Claude
 * Code plugin injects at session start -- so a single source feeds both paths.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateAgentContract } from '../mcp/agent-contract.js';
import { getRaftersPaths } from '../utils/paths.js';

export const START_MARKER = '<!-- rafters:agent-contract:start -->';
export const END_MARKER = '<!-- rafters:agent-contract:end -->';

/**
 * Pure merge function, unit-testable without touching disk.
 * - existing === null: returns the marker-delimited block alone.
 * - existing has both markers in order: replaces only the span between them
 *   (inclusive), leaving all surrounding content untouched.
 * - existing has zero or exactly one marker (no valid block, including a
 *   partially-corrupted single marker or reversed markers): appends a fresh
 *   block after the existing content rather than attempting a partial repair.
 *   Partial repair is deliberately not attempted -- a corrupted block is left
 *   in place and a clean block is appended, so nothing the user wrote is lost.
 */
export function mergeAgentContract(existing: string | null, contract: string): string {
  const block = `${START_MARKER}\n${contract}\n${END_MARKER}`;

  if (existing === null) {
    return `${block}\n`;
  }

  const startIdx = existing.indexOf(START_MARKER);
  const endIdx = existing.indexOf(END_MARKER);

  if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + END_MARKER.length);
    return `${before}${block}${after}`;
  }

  return `${existing.trimEnd()}\n\n${block}\n`;
}

/**
 * `rafters agents` command action. Requires an existing
 * .rafters/config.rafters.json at cwd (run `rafters init` first); throws
 * without writing anything if absent. Writes/updates AGENTS.md at the project
 * root via mergeAgentContract.
 */
export async function agents(): Promise<void> {
  const cwd = process.cwd();
  const paths = getRaftersPaths(cwd);

  if (!existsSync(paths.config)) {
    throw new Error(
      `No rafters project found: ${paths.config} is missing. Run \`rafters init\` first.`,
    );
  }

  const agentsPath = join(cwd, 'AGENTS.md');
  const existing = existsSync(agentsPath) ? await readFile(agentsPath, 'utf-8') : null;
  const merged = mergeAgentContract(existing, generateAgentContract());

  await writeFile(agentsPath, merged);
}
