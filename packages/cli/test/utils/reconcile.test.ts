/**
 * Unit tests for update reconciliation.
 *
 * The candidate-set builder is pure, so the cases that matter -- a tracked
 * name survives, an untracked on-disk name is discovered, a registry name with
 * no files on disk is left alone -- need neither a filesystem nor a network.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { RaftersConfig } from '../../src/commands/init.js';
import {
  buildUpdateCandidates,
  type DirEntries,
  type DiscoveryIndex,
  hasEntryFor,
  readInstallRoots,
} from '../../src/utils/reconcile.js';

const EMPTY_ENTRIES: DirEntries = { components: [], primitives: [], composites: [] };

function index(overrides: Partial<DiscoveryIndex> = {}): DiscoveryIndex {
  return { components: [], primitives: [], composites: [], ...overrides };
}

describe('hasEntryFor', () => {
  it('matches the component file and its shared siblings', () => {
    const entries = ['container.tsx', 'container.behavior.ts', 'container.classes.ts'];
    expect(hasEntryFor(entries, 'container')).toBe(true);
  });

  it('matches an extensionless entry', () => {
    expect(hasEntryFor(['container'], 'container')).toBe(true);
  });

  it('does not let a name claim a longer sibling name', () => {
    expect(hasEntryFor(['grid-item.tsx'], 'grid')).toBe(false);
  });

  it('is false when nothing on disk belongs to the name', () => {
    expect(hasEntryFor(['button.tsx'], 'container')).toBe(false);
  });
});

describe('buildUpdateCandidates', () => {
  it('keeps tracked names even when their files have drifted off disk', () => {
    const result = buildUpdateCandidates(
      ['container'],
      index({ components: ['container'] }),
      EMPTY_ENTRIES,
    );

    expect(result.tracked).toEqual(['container']);
    expect(result.untracked).toEqual([]);
  });

  it('discovers an on-disk component the config never tracked', () => {
    const result = buildUpdateCandidates(
      ['button'],
      index({ components: ['button', 'container'] }),
      {
        ...EMPTY_ENTRIES,
        components: ['button.tsx', 'container.tsx'],
      },
    );

    expect(result.untracked).toEqual(['container']);
  });

  it('discovers untracked primitives and composites too', () => {
    const result = buildUpdateCandidates(
      [],
      index({ primitives: ['classy'], composites: ['hero'] }),
      {
        components: [],
        primitives: ['classy.ts'],
        composites: ['hero.composite.json'],
      },
    );

    expect(result.untracked).toEqual(['classy', 'hero']);
  });

  it('ignores registry names with no files in the project', () => {
    const result = buildUpdateCandidates([], index({ components: ['button', 'container'] }), {
      ...EMPTY_ENTRIES,
      components: ['container.tsx'],
    });

    expect(result.untracked).toEqual(['container']);
  });

  it('ignores project files that are not registry items', () => {
    const result = buildUpdateCandidates([], index({ components: ['button'] }), {
      ...EMPTY_ENTRIES,
      components: ['my-own-widget.tsx'],
    });

    expect(result.untracked).toEqual([]);
  });

  it('discovers nothing when the registry index is unavailable', () => {
    const result = buildUpdateCandidates(['button'], null, {
      ...EMPTY_ENTRIES,
      components: ['container.tsx'],
    });

    expect(result.tracked).toEqual(['button']);
    expect(result.untracked).toEqual([]);
  });
});

describe('readInstallRoots', () => {
  const projectDir = join(import.meta.dirname, '.tmp-reconcile');

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('reads the configured folders and tolerates missing ones', async () => {
    await mkdir(join(projectDir, 'src/components/ui'), { recursive: true });
    await writeFile(join(projectDir, 'src/components/ui/container.tsx'), 'export {};');

    const config = {
      componentsPath: 'src/components/ui',
      primitivesPath: 'src/lib/primitives',
      compositesPath: 'src/composites',
    } as RaftersConfig;

    const entries = readInstallRoots(projectDir, config);

    expect(entries.components).toEqual(['container.tsx']);
    expect(entries.primitives).toEqual([]);
    expect(entries.composites).toEqual([]);
  });

  it('falls back to the default folders when config is absent', async () => {
    await mkdir(join(projectDir, 'components/ui'), { recursive: true });
    await writeFile(join(projectDir, 'components/ui/button.tsx'), 'export {};');

    expect(readInstallRoots(projectDir, null).components).toEqual(['button.tsx']);
  });
});
