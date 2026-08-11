/**
 * Studio command tests
 *
 * Creates fixture projects, runs the same generate+save flow that
 * `rafters init` performs, then exercises the registry's set/cascade
 * paths to validate the studio command's prerequisites work end-to-end
 * against the new @rafters/design-tokens package.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  loadRegistryFromDir,
  saveRegistryToDir,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture } from '../fixtures/projects';

const PLUGINS = [scalePlugin, contrastPlugin, statePlugin, invertPlugin];

async function initProject(projectPath: string): Promise<number> {
  const tokensDir = join(projectPath, '.rafters', 'tokens');
  await mkdir(tokensDir, { recursive: true });
  const system = generateBaseSystem();
  const registry = new TokenRegistry(system.allTokens, PLUGINS);
  saveRegistryToDir(tokensDir, registry);
  return registry.size();
}

describe('studio prerequisites', () => {
  it('rafters init creates .rafters/tokens/ with namespace files', async () => {
    const fixturePath = await createFixture('nextjs-shadcn-v4');
    try {
      const tokenCount = await initProject(fixturePath);
      expect(tokenCount).toBeGreaterThanOrEqual(500);

      const tokensDir = join(fixturePath, '.rafters', 'tokens');
      expect(existsSync(tokensDir)).toBe(true);

      const namespaces = [
        'color',
        'spacing',
        'typography',
        'breakpoint',
        'semantic',
        'radius',
        'shadow',
        'depth',
        'motion',
        'focus',
      ];
      for (const ns of namespaces) {
        const file = join(tokensDir, `${ns}.rafters.json`);
        expect(existsSync(file), `${ns}.rafters.json should exist`).toBe(true);

        const content = JSON.parse(await readFile(file, 'utf-8'));
        expect(content.namespace).toBe(ns);
        expect(content.tokens.length).toBeGreaterThan(0);
      }

      // The elevation namespace is deleted (#1638 S2) -- depth words and
      // shadow utilities are the rendering surface; meanings live in composites.
      expect(existsSync(join(tokensDir, 'elevation.rafters.json'))).toBe(false);
    } finally {
      await cleanupFixture(fixturePath);
    }
  });

  it('generates correct token counts per namespace', async () => {
    const fixturePath = await createFixture('vite-no-shadcn');
    try {
      await initProject(fixturePath);
      const tokensDir = join(fixturePath, '.rafters', 'tokens');

      const counts: Record<string, number> = {};
      for (const ns of [
        'color',
        'spacing',
        'typography',
        'semantic',
        'radius',
        'shadow',
        'depth',
        'motion',
        'focus',
        'breakpoint',
      ]) {
        const content = JSON.parse(await readFile(join(tokensDir, `${ns}.rafters.json`), 'utf-8'));
        counts[ns] = content.tokens.length;
      }

      expect(counts.color).toBeGreaterThanOrEqual(80);
      // A lower bound, like every sibling assertion here. Spacing was the only
      // exact count in this list, which pinned it to the shape of the linear
      // ladder rather than to "the namespace generated" (#2031).
      expect(counts.spacing).toBeGreaterThanOrEqual(20);
      expect(counts.typography).toBeGreaterThanOrEqual(50);
      expect(counts.semantic).toBeGreaterThanOrEqual(190);
      expect(counts.radius).toBeGreaterThanOrEqual(9);
      expect(counts.shadow).toBeGreaterThanOrEqual(8);
      expect(counts.depth).toBeGreaterThanOrEqual(9);
      expect(counts.motion).toBeGreaterThanOrEqual(50);
      expect(counts.focus).toBeGreaterThanOrEqual(15);
    } finally {
      await cleanupFixture(fixturePath);
    }
  });

  it('tokens can be loaded back via loadRegistryFromDir', async () => {
    const fixturePath = await createFixture('astro-shadcn-v4');
    try {
      const expectedCount = await initProject(fixturePath);

      const tokensDir = join(fixturePath, '.rafters', 'tokens');
      const reloaded = loadRegistryFromDir(tokensDir, PLUGINS);
      expect(reloaded.size()).toBe(expectedCount);

      // Any spacing token proves the round-trip. Naming one tied this to the
      // rungs the scale happened to have.
      const spacing = [...reloaded.list()].find((t) => t.namespace === 'spacing');
      expect(spacing).toBeTruthy();
      expect(spacing?.namespace).toBe('spacing');
      expect(spacing?.value).toBeTruthy();

      const primary = reloaded.get('primary');
      expect(primary).toBeTruthy();
      expect(primary?.namespace).toBe('semantic');
    } finally {
      await cleanupFixture(fixturePath);
    }
  });

  it('works for all framework fixtures', async () => {
    const fixtures = [
      'nextjs-shadcn-v4',
      'vite-shadcn-v4',
      'remix-shadcn-v4',
      'astro-shadcn-v4',
      'vite-no-shadcn',
      'nextjs-no-shadcn',
    ] as const;

    for (const type of fixtures) {
      const fixturePath = await createFixture(type);
      try {
        const count = await initProject(fixturePath);
        expect(count, `${type} should generate 500+ tokens`).toBeGreaterThanOrEqual(500);

        const tokensDir = join(fixturePath, '.rafters', 'tokens');
        const reloaded = loadRegistryFromDir(tokensDir, PLUGINS);
        expect(reloaded.size(), `${type} should load back same count`).toBe(count);
      } finally {
        await cleanupFixture(fixturePath);
      }
    }
  }, 30000);
});
