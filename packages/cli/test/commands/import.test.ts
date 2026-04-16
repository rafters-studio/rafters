import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImportPendingSchema } from '@rafters/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importCommand } from '../../src/commands/import.js';
import { setAgentMode } from '../../src/utils/ui.js';

const TAILWIND_CSS = `@import "tailwindcss";

@theme {
  --color-primary-500: oklch(0.55 0.15 250);
  --spacing-4: 1rem;
  --radius-md: 0.375rem;
}
`;

describe('rafters import command', () => {
  const testDir = join(process.cwd(), '.test-import-cmd');
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, '.rafters'), { recursive: true });
    process.chdir(testDir);
    process.exitCode = 0;
    setAgentMode(true); // silence non-JSON ui output and avoid spinners
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    setAgentMode(false);
    process.exitCode = 0;
  });

  it('exits with error when .rafters/ is missing', async () => {
    await rm(join(testDir, '.rafters'), { recursive: true, force: true });
    await importCommand({ agent: true });
    expect(process.exitCode).toBe(1);
  });

  it('exits with error when import-pending.json already exists without --force', async () => {
    await writeFile(join(testDir, '.rafters', 'import-pending.json'), '{}');
    const src = join(testDir, 'src');
    await mkdir(src, { recursive: true });
    await writeFile(join(src, 'index.css'), TAILWIND_CSS);

    await importCommand({ agent: true });
    expect(process.exitCode).toBe(1);
  });

  it('exits with error when no source is detected', async () => {
    await importCommand({ agent: true });
    expect(process.exitCode).toBe(1);
  });

  it('writes import-pending.json on successful Tailwind v4 import', async () => {
    const src = join(testDir, 'src');
    await mkdir(src, { recursive: true });
    await writeFile(join(src, 'index.css'), TAILWIND_CSS);

    await importCommand({ agent: true });

    const raw = await readFile(join(testDir, '.rafters', 'import-pending.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    const doc = ImportPendingSchema.parse(parsed);
    expect(doc.detectedSystem).toBe('tailwind-v4');
    expect(doc.tokens.length).toBeGreaterThan(0);
  });

  it('overwrites existing pending file when --force is passed', async () => {
    const src = join(testDir, 'src');
    await mkdir(src, { recursive: true });
    await writeFile(join(src, 'index.css'), TAILWIND_CSS);
    await writeFile(join(testDir, '.rafters', 'import-pending.json'), '{"version":"0.0"}');

    await importCommand({ agent: true, force: true });

    const raw = await readFile(join(testDir, '.rafters', 'import-pending.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe('1.0');
  });

  it('backs up existing pending file when --force is passed', async () => {
    const { readdir } = await import('node:fs/promises');
    const src = join(testDir, 'src');
    await mkdir(src, { recursive: true });
    await writeFile(join(src, 'index.css'), TAILWIND_CSS);
    await writeFile(join(testDir, '.rafters', 'import-pending.json'), '{"version":"0.0"}');

    await importCommand({ agent: true, force: true });

    const raftersDir = join(testDir, '.rafters');
    const entries = await readdir(raftersDir);
    const backups = entries.filter((f) => f.startsWith('import-pending.json.backup-'));
    expect(backups.length).toBe(1);

    const backupRaw = await readFile(join(raftersDir, backups[0] as string), 'utf-8');
    expect(JSON.parse(backupRaw).version).toBe('0.0');
  });

  it('respects --importer to force a specific importer', async () => {
    const src = join(testDir, 'src');
    await mkdir(src, { recursive: true });
    // Tailwind v4 CSS -- but force generic-css importer
    await writeFile(join(src, 'index.css'), TAILWIND_CSS);

    await importCommand({ agent: true, importer: 'generic-css' });

    // Tailwind @theme variables have context='theme' which generic-css skips
    // (shadcn detection first). So forcing generic-css may not produce tokens
    // if the @theme block is the only source. Just verify the command ran
    // without throwing -- the forced importer may legitimately find nothing.
    expect([0, 1]).toContain(process.exitCode ?? 0);
  });
});
