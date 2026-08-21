import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateAgentContract, liveToolNames } from '../../src/mcp/agent-contract.js';
import { TOOL_DEFINITIONS } from '../../src/mcp/tools.js';

const REPO_ROOT = join(import.meta.dirname, '../../../..');

describe('generateAgentContract', () => {
  it('names every live (non-deprecated) tool', () => {
    const contract = generateAgentContract();
    const live = TOOL_DEFINITIONS.filter((t) => !t.description.startsWith('[DEPRECATED'));
    for (const tool of live) {
      expect(contract).toContain(tool.name);
    }
    expect(live.length).toBeGreaterThan(0);
  });

  it('never names a deprecated tool, or rafters_vocabulary', () => {
    const contract = generateAgentContract();
    const deprecated = TOOL_DEFINITIONS.filter((t) => t.description.startsWith('[DEPRECATED'));
    for (const tool of deprecated) {
      expect(contract).not.toContain(tool.name);
    }
    expect(contract).not.toContain('rafters_vocabulary');
  });

  it('mentions no rafters_* tool outside the live roster', () => {
    const contract = generateAgentContract();
    const mentioned = [...contract.matchAll(/rafters_[a-z_]+/g)].map((m) => m[0]);
    const live = new Set(liveToolNames());
    for (const name of mentioned) {
      expect(live.has(name)).toBe(true);
    }
  });

  it('instructs pinned local-bin invocation, not @latest', () => {
    const contract = generateAgentContract();
    expect(contract).toContain('pnpm exec rafters mcp');
    expect(contract).not.toMatch(/rafters@latest/);
  });
});

describe('plugin/hooks/agent-contract.md lockstep', () => {
  it('matches the generator output exactly', async () => {
    const committed = await readFile(join(REPO_ROOT, 'plugin/hooks/agent-contract.md'), 'utf-8');
    expect(committed).toBe(generateAgentContract());
  });
});
