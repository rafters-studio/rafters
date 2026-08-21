/**
 * Generate the committed plugin/hooks/agent-contract.md from the live MCP tool
 * surface. Run as a step of the CLI `build` script (after tsup) so the file the
 * Claude Code plugin ships at session start stays in lockstep with the tool
 * definitions. A lockstep test asserts the committed file equals this output.
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateAgentContract } from '../src/mcp/agent-contract.js';

const REPO_ROOT = join(import.meta.dirname, '../../..');

await writeFile(join(REPO_ROOT, 'plugin/hooks/agent-contract.md'), generateAgentContract());
