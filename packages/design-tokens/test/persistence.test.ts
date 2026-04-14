import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Token } from '@rafters/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodePersistenceAdapter } from '../src/persistence/node-adapter.js';

describe('NodePersistenceAdapter', () => {
  const testDir = '/tmp/rafters-test-persistence';
  let adapter: NodePersistenceAdapter;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    adapter = new NodePersistenceAdapter(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should save and load tokens', async () => {
    const tokens: Token[] = [
      {
        name: 'test-token',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      },
    ];

    await adapter.save(tokens);
    const loaded = await adapter.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({
      name: 'test-token',
      value: '1rem',
      category: 'spacing',
      namespace: 'spacing',
    });
  });

  it('should create directory structure on save', async () => {
    const tokens: Token[] = [
      {
        name: 'test',
        value: '1',
        category: 'test',
        namespace: 'test',
        userOverride: null,
      },
    ];

    await adapter.save(tokens);

    const content = await readFile(
      join(testDir, '.rafters', 'tokens', 'test.rafters.json'),
      'utf-8',
    );
    const data = JSON.parse(content);
    expect(data.namespace).toBe('test');
    expect(data.tokens).toEqual(tokens);
  });

  it('should include schema and version in saved files', async () => {
    const tokens: Token[] = [
      { name: 'color-1', value: '#fff', category: 'color', namespace: 'color', userOverride: null },
    ];
    await adapter.save(tokens);

    const content = await readFile(
      join(testDir, '.rafters', 'tokens', 'color.rafters.json'),
      'utf-8',
    );
    const data = JSON.parse(content);

    expect(data.$schema).toBe('https://rafters.studio/schemas/namespace-tokens.json');
    expect(data.version).toBe('1.0.0');
    expect(data.generatedAt).toBeDefined();
  });

  it('should return empty array if tokens directory does not exist', async () => {
    const loaded = await adapter.load();
    expect(loaded).toEqual([]);
  });

  it('should group tokens by namespace into separate files', async () => {
    const tokens: Token[] = [
      { name: 'color-1', value: '#fff', category: 'color', namespace: 'color', userOverride: null },
      {
        name: 'spacing-1',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      },
    ];

    await adapter.save(tokens);

    // Check color file
    const colorContent = await readFile(
      join(testDir, '.rafters', 'tokens', 'color.rafters.json'),
      'utf-8',
    );
    const colorData = JSON.parse(colorContent);
    expect(colorData.tokens).toHaveLength(1);
    expect(colorData.tokens[0].name).toBe('color-1');

    // Check spacing file
    const spacingContent = await readFile(
      join(testDir, '.rafters', 'tokens', 'spacing.rafters.json'),
      'utf-8',
    );
    const spacingData = JSON.parse(spacingContent);
    expect(spacingData.tokens).toHaveLength(1);
    expect(spacingData.tokens[0].name).toBe('spacing-1');
  });

  it('should load tokens from multiple namespace files', async () => {
    const tokens: Token[] = [
      { name: 'color-1', value: '#fff', category: 'color', namespace: 'color', userOverride: null },
      { name: 'color-2', value: '#000', category: 'color', namespace: 'color', userOverride: null },
      {
        name: 'spacing-1',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      },
    ];

    await adapter.save(tokens);
    const loaded = await adapter.load();

    expect(loaded).toHaveLength(3);
    expect(loaded.map((t) => t.name).sort()).toEqual(['color-1', 'color-2', 'spacing-1']);
  });

  it('should overwrite existing namespace on save', async () => {
    const tokens1: Token[] = [
      { name: 'old', value: '1', category: 'test', namespace: 'test', userOverride: null },
    ];
    const tokens2: Token[] = [
      { name: 'new', value: '2', category: 'test', namespace: 'test', userOverride: null },
    ];

    await adapter.save(tokens1);
    await adapter.save(tokens2);

    const loaded = await adapter.load();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.name).toBe('new');
  });

  it('should handle multiple tokens in same namespace', async () => {
    const tokens: Token[] = [
      {
        name: 'spacing-1',
        value: '0.25rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      },
      {
        name: 'spacing-2',
        value: '0.5rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      },
      {
        name: 'spacing-4',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      },
    ];

    await adapter.save(tokens);
    const loaded = await adapter.load();

    expect(loaded).toHaveLength(3);
  });
});
