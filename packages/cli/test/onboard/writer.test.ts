import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ImportPendingSchema, type Token } from '@rafters/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { OnboardResult } from '../../src/onboard/orchestrator.js';
import { toImportPending, writeImportPending } from '../../src/onboard/writer.js';

const token: Token = {
  name: 'primary-500',
  value: 'oklch(0.55 0.15 250)',
  category: 'color',
  namespace: 'color',
  userOverride: null,
  containerQueryAware: true,
  semanticMeaning: 'Imported from Tailwind v4 --color-primary-500',
};

const successfulResult: OnboardResult = {
  success: true,
  tokens: [token],
  source: 'tailwind-v4',
  confidence: 0.95,
  detectedBy: ['@theme block'],
  sourcePaths: ['/project/src/index.css'],
  warnings: [],
  stats: { variablesProcessed: 1, tokensCreated: 1, skipped: 0 },
};

const projectRoot = '/project';

describe('toImportPending', () => {
  it('builds a valid ImportPending document', () => {
    const doc = toImportPending(successfulResult, projectRoot);
    expect(() => ImportPendingSchema.parse(doc)).not.toThrow();
  });

  it('converts tokens to pending tokens with pending decision', () => {
    const doc = toImportPending(successfulResult, projectRoot);
    expect(doc.tokens).toHaveLength(1);
    expect(doc.tokens[0]?.decision).toBe('pending');
    expect(doc.tokens[0]?.proposed).toEqual(token);
  });

  it('recovers source variable name from semanticMeaning', () => {
    const doc = toImportPending(successfulResult, projectRoot);
    expect(doc.tokens[0]?.original.name).toBe('--color-primary-500');
  });

  it('falls back to token name when semanticMeaning lacks a --var', () => {
    const result: OnboardResult = {
      ...successfulResult,
      tokens: [{ ...token, semanticMeaning: 'no var here' }],
    };
    const doc = toImportPending(result, projectRoot);
    expect(doc.tokens[0]?.original.name).toBe('primary-500');
  });

  it('stores source as project-relative path', () => {
    const doc = toImportPending(successfulResult, projectRoot);
    expect(doc.source).toBe('src/index.css');
  });

  it('captures detectedSystem and systemConfidence', () => {
    const doc = toImportPending(successfulResult, projectRoot);
    expect(doc.detectedSystem).toBe('tailwind-v4');
    expect(doc.systemConfidence).toBe(0.95);
  });

  it('includes additionalSources when multiple paths exist', () => {
    const result: OnboardResult = {
      ...successfulResult,
      sourcePaths: ['/project/src/index.css', '/project/src/theme.css'],
    };
    const doc = toImportPending(result, projectRoot);
    expect(doc.additionalSources).toEqual(['src/theme.css']);
  });

  it('omits additionalSources when only one path', () => {
    const doc = toImportPending(successfulResult, projectRoot);
    expect(doc.additionalSources).toBeUndefined();
  });

  it('propagates info/warning warnings', () => {
    const result: OnboardResult = {
      ...successfulResult,
      warnings: [
        { level: 'info', message: 'Duplicate token skipped' },
        { level: 'warning', message: 'Unknown namespace' },
      ],
    };
    const doc = toImportPending(result, projectRoot);
    expect(doc.warnings).toHaveLength(2);
  });

  it('throws on a failed onboard result', () => {
    const failed: OnboardResult = {
      success: false,
      tokens: [],
      source: null,
      confidence: 0,
      detectedBy: [],
      sourcePaths: [],
      warnings: [{ level: 'error', message: 'boom' }],
      stats: { variablesProcessed: 0, tokensCreated: 0, skipped: 0 },
    };
    expect(() => toImportPending(failed, projectRoot)).toThrow(/failed onboard/);
  });
});

describe('writeImportPending', () => {
  const testDir = join(process.cwd(), '.test-writer');
  const pendingPath = join(testDir, '.rafters', 'import-pending.json');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('writes a valid JSON file that parses back through the schema', async () => {
    const doc = toImportPending(successfulResult, testDir);
    await writeImportPending(pendingPath, doc);

    const raw = await readFile(pendingPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(() => ImportPendingSchema.parse(parsed)).not.toThrow();
    expect(parsed.detectedSystem).toBe('tailwind-v4');
  });

  it('creates parent directories if missing', async () => {
    const deep = join(testDir, 'a', 'b', 'c', 'pending.json');
    const doc = toImportPending(successfulResult, testDir);
    await writeImportPending(deep, doc);

    const raw = await readFile(deep, 'utf-8');
    expect(raw).toContain('"version": "1.0"');
  });

  it('ends file with newline', async () => {
    const doc = toImportPending(successfulResult, testDir);
    await writeImportPending(pendingPath, doc);
    const raw = await readFile(pendingPath, 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
  });
});
