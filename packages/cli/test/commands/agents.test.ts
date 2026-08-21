import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agents, END_MARKER, mergeAgentContract, START_MARKER } from '../../src/commands/agents.js';

describe('mergeAgentContract', () => {
  it('returns the block alone when no AGENTS.md exists', () => {
    const result = mergeAgentContract(null, 'CONTRACT BODY');
    expect(result).toBe(`${START_MARKER}\nCONTRACT BODY\n${END_MARKER}\n`);
  });

  it('replaces only the marked span, preserving surrounding content', () => {
    const existing = `# My project\n\n${START_MARKER}\nOLD\n${END_MARKER}\n\n## Custom section\nuser text\n`;
    const result = mergeAgentContract(existing, 'NEW CONTRACT');
    expect(result).toBe(
      `# My project\n\n${START_MARKER}\nNEW CONTRACT\n${END_MARKER}\n\n## Custom section\nuser text\n`,
    );
  });

  it('appends the block when no markers are present, preserving existing content', () => {
    const existing = '# My project\n\nHand-written notes.\n';
    const result = mergeAgentContract(existing, 'NEW CONTRACT');
    expect(result.startsWith(existing.trimEnd())).toBe(true);
    expect(result).toContain(`${START_MARKER}\nNEW CONTRACT\n${END_MARKER}`);
  });
});

describe('rafters agents', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'rafters-agents-'));
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('throws without writing when .rafters/config.rafters.json is absent', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
    await expect(agents()).rejects.toThrow(/rafters init/);
    cwdSpy.mockRestore();
  });

  it('writes AGENTS.md when a rafters project marker exists', async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(projectDir, '.rafters'), { recursive: true });
    await writeFile(join(projectDir, '.rafters', 'config.rafters.json'), '{}');
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
    await agents();
    cwdSpy.mockRestore();
    const written = await readFile(join(projectDir, 'AGENTS.md'), 'utf-8');
    expect(written).toContain(START_MARKER);
  });
});
