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
    // Exact -- pins that existing content is preserved AND that exactly one
    // blank line separates it from the appended block (not just "contains").
    expect(result).toBe(
      `# My project\n\nHand-written notes.\n\n${START_MARKER}\nNEW CONTRACT\n${END_MARKER}\n`,
    );
  });

  it('appends a fresh block (never partial-repairs) when a marker is missing or reversed', () => {
    // Only a START marker (corrupted block): append, leaving the corrupt
    // marker in place -- nothing the user wrote is touched.
    const single = `# P\n\n${START_MARKER}\ndangling\n`;
    expect(mergeAgentContract(single, 'C')).toBe(
      `# P\n\n${START_MARKER}\ndangling\n\n${START_MARKER}\nC\n${END_MARKER}\n`,
    );
    // END before START (reversed order): the startIdx < endIdx guard makes this
    // fall through to append, not a span replacement. Deleting that guard breaks
    // this exact expectation.
    const reversed = `${END_MARKER}\nx\n${START_MARKER}\n`;
    expect(mergeAgentContract(reversed, 'C')).toBe(
      `${END_MARKER}\nx\n${START_MARKER}\n\n${START_MARKER}\nC\n${END_MARKER}\n`,
    );
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
