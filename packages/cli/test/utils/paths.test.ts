import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getOutputFilePath,
  getRaftersPaths,
  getTokenFilePath,
  resolveReadSet,
  resolveRoot,
} from '../../src/utils/paths.js';

describe('getRaftersPaths', () => {
  it('should return correct paths for project root', () => {
    const projectRoot = '/home/user/my-project';
    const paths = getRaftersPaths(projectRoot);

    expect(paths.root).toBe(join(projectRoot, '.rafters'));
    expect(paths.config).toBe(join(projectRoot, '.rafters', 'config.rafters.json'));
    expect(paths.tokens).toBe(join(projectRoot, '.rafters', 'tokens'));
    expect(paths.output).toBe(join(projectRoot, '.rafters', 'output'));
  });

  it('should handle paths with trailing slash', () => {
    const projectRoot = '/home/user/my-project/';
    const paths = getRaftersPaths(projectRoot);

    expect(paths.root).toBe(join(projectRoot, '.rafters'));
  });

  it('should handle relative paths', () => {
    const projectRoot = './my-project';
    const paths = getRaftersPaths(projectRoot);

    expect(paths.root).toBe(join(projectRoot, '.rafters'));
    expect(paths.tokens).toBe(join(projectRoot, '.rafters', 'tokens'));
  });
});

describe('getTokenFilePath', () => {
  it('should return correct token file path for namespace', () => {
    const projectRoot = '/home/user/my-project';

    expect(getTokenFilePath(projectRoot, 'color')).toBe(
      join(projectRoot, '.rafters', 'tokens', 'color.rafters.json'),
    );
    expect(getTokenFilePath(projectRoot, 'spacing')).toBe(
      join(projectRoot, '.rafters', 'tokens', 'spacing.rafters.json'),
    );
    expect(getTokenFilePath(projectRoot, 'typography')).toBe(
      join(projectRoot, '.rafters', 'tokens', 'typography.rafters.json'),
    );
  });
});

describe('getOutputFilePath', () => {
  it('should return correct output file paths', () => {
    const projectRoot = '/home/user/my-project';

    expect(getOutputFilePath(projectRoot, 'theme.css')).toBe(
      join(projectRoot, '.rafters', 'output', 'theme.css'),
    );
    expect(getOutputFilePath(projectRoot, 'tokens.json')).toBe(
      join(projectRoot, '.rafters', 'output', 'tokens.json'),
    );
    expect(getOutputFilePath(projectRoot, 'tokens.ts')).toBe(
      join(projectRoot, '.rafters', 'output', 'tokens.ts'),
    );
  });
});

describe('resolveRoot', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'rafters-paths-'));
    mkdirSync(join(tmp, 'src/composites'), { recursive: true });
    mkdirSync(join(tmp, 'src/legacy'), { recursive: true });
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns a single string field as-is', () => {
    expect(resolveRoot('src/composites', tmp, 'composites')).toBe('src/composites');
  });

  it('picks the entry tagged { root: true }', () => {
    const field = [
      'src/composites',
      { path: 'src/legacy', root: true as const },
      '../shared/composites',
    ];
    expect(resolveRoot(field, tmp, 'composites')).toBe('src/legacy');
  });

  it('picks the first entry that resolves inside cwd when no explicit root', () => {
    const field = ['../shared/composites', 'src/composites'];
    expect(resolveRoot(field, tmp, 'composites')).toBe('src/composites');
  });

  it('falls back when zero entries resolve inside cwd', () => {
    const field = ['../shared/composites', '/abs/external/composites'];
    expect(resolveRoot(field, tmp, 'composites')).toBe('composites');
  });
});

describe('resolveReadSet', () => {
  let tmp: string;
  let real: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'rafters-paths-'));
    mkdirSync(join(tmp, 'src/composites'), { recursive: true });
    mkdirSync(join(tmp, 'shared'), { recursive: true });
    real = realpathSync(tmp);
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns single string as one absolute entry', () => {
    const out = resolveReadSet('src/composites', tmp);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(resolve(real, 'src/composites'));
  });

  it('puts the install root first regardless of array order', () => {
    const field = ['../shared', 'src/composites'];
    const out = resolveReadSet(field, tmp);
    expect(out[0]).toBe(resolve(real, 'src/composites'));
    expect(out[1]).toBe(resolve(real, '../shared'));
  });

  it('deduplicates entries that realpath to the same location', () => {
    const out = resolveReadSet(['src/composites', 'src/composites'], tmp);
    expect(out).toHaveLength(1);
  });
});
