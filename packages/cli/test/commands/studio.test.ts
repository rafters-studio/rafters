/**
 * Studio command tests
 *
 * Creates fixture projects, runs the same generate+save flow that
 * `rafters init` performs, then exercises the registry's set/cascade
 * paths to validate the studio command's prerequisites work end-to-end
 * against the new @rafters/design-tokens package.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  loadRegistryFromDir,
  registryToVars,
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
        'elevation',
        'focus',
      ];
      for (const ns of namespaces) {
        const file = join(tokensDir, `${ns}.rafters.json`);
        expect(existsSync(file), `${ns}.rafters.json should exist`).toBe(true);

        const content = JSON.parse(await readFile(file, 'utf-8'));
        expect(content.namespace).toBe(ns);
        expect(content.tokens.length).toBeGreaterThan(0);
      }
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
        'elevation',
        'focus',
        'breakpoint',
      ]) {
        const content = JSON.parse(await readFile(join(tokensDir, `${ns}.rafters.json`), 'utf-8'));
        counts[ns] = content.tokens.length;
      }

      expect(counts.color).toBeGreaterThanOrEqual(80);
      expect(counts.spacing).toBe(36);
      expect(counts.typography).toBeGreaterThanOrEqual(50);
      expect(counts.semantic).toBeGreaterThanOrEqual(190);
      expect(counts.radius).toBeGreaterThanOrEqual(9);
      expect(counts.shadow).toBeGreaterThanOrEqual(8);
      expect(counts.depth).toBeGreaterThanOrEqual(9);
      expect(counts.motion).toBeGreaterThanOrEqual(50);
      expect(counts.elevation).toBeGreaterThanOrEqual(20);
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

      const spacing = reloaded.get('spacing-4');
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

describe('studio API affects stylesheet in realtime', () => {
  it('registryToVars generates CSS with token values', async () => {
    const fixturePath = await createFixture('nextjs-shadcn-v4');
    try {
      await initProject(fixturePath);

      const tokensDir = join(fixturePath, '.rafters', 'tokens');
      const registry = loadRegistryFromDir(tokensDir, PLUGINS);

      const css = registryToVars(registry);
      expect(css).toContain(':root');
      expect(css).toContain('--rafters-');
      expect(css).toContain('spacing');
    } finally {
      await cleanupFixture(fixturePath);
    }
  });

  it('changing a spacing token updates the CSS output', async () => {
    const fixturePath = await createFixture('vite-shadcn-v4');
    try {
      await initProject(fixturePath);

      const tokensDir = join(fixturePath, '.rafters', 'tokens');
      const registry = loadRegistryFromDir(tokensDir, PLUGINS);

      const cssBefore = registryToVars(registry);

      const spacing4 = registry.get('spacing-4');
      expect(spacing4).toBeTruthy();
      if (!spacing4) throw new Error('spacing-4 not found');

      registry.set('spacing-4', '99rem', { reason: 'Testing realtime CSS update' });

      const cssAfter = registryToVars(registry);

      expect(cssAfter).not.toBe(cssBefore);
      expect(cssAfter).toContain('99rem');
      expect(cssBefore).not.toContain('99rem');
    } finally {
      await cleanupFixture(fixturePath);
    }
  });

  it('changing a color token cascades to semantic tokens in CSS', async () => {
    const fixturePath = await createFixture('astro-shadcn-v4');
    try {
      await initProject(fixturePath);

      const tokensDir = join(fixturePath, '.rafters', 'tokens');
      const registry = loadRegistryFromDir(tokensDir, PLUGINS);

      const cssBefore = registryToVars(registry);

      const colorTokens = registry.list({ namespace: 'color' });
      const familyToken = colorTokens.find(
        (t) => typeof t.value === 'object' && t.value !== null && 'scale' in t.value,
      );
      expect(familyToken).toBeTruthy();

      const semanticTokens = registry.list({ namespace: 'semantic' });
      expect(semanticTokens.length).toBeGreaterThan(0);

      expect(cssBefore).toContain('--primary');
      expect(cssBefore).toContain('--background');
      expect(cssBefore).toContain('--foreground');
    } finally {
      await cleanupFixture(fixturePath);
    }
  });

  it('token change persists to disk and CSS file can be written', async () => {
    const fixturePath = await createFixture('remix-shadcn-v4');
    try {
      await initProject(fixturePath);

      const outputDir = join(fixturePath, '.rafters', 'output');
      await mkdir(outputDir, { recursive: true });
      const outputPath = join(outputDir, 'rafters.vars.css');

      const tokensDir = join(fixturePath, '.rafters', 'tokens');
      const registry = loadRegistryFromDir(tokensDir, PLUGINS);

      const cssInitial = registryToVars(registry);
      await writeFile(outputPath, cssInitial);
      expect(existsSync(outputPath)).toBe(true);

      const initialContent = await readFile(outputPath, 'utf-8');
      expect(initialContent).toContain(':root');

      const spacing8 = registry.get('spacing-8');
      expect(spacing8).toBeTruthy();
      if (!spacing8) throw new Error('spacing-8 not found');

      registry.set('spacing-8', '77rem', {
        reason: 'Verify disk persistence and CSS regeneration',
      });
      saveRegistryToDir(tokensDir, registry);

      const cssUpdated = registryToVars(registry);
      await writeFile(outputPath, cssUpdated);

      const updatedContent = await readFile(outputPath, 'utf-8');
      expect(updatedContent).toContain('77rem');
      expect(initialContent).not.toContain('77rem');

      const reloaded = loadRegistryFromDir(tokensDir, PLUGINS);
      const reloadedSpacing8 = reloaded.get('spacing-8');
      expect(reloadedSpacing8?.value).toBe('77rem');
      expect(reloadedSpacing8?.userOverride?.reason).toBe(
        'Verify disk persistence and CSS regeneration',
      );
    } finally {
      await cleanupFixture(fixturePath);
    }
  });

  it('multiple rapid token changes all reflect in CSS', async () => {
    const fixturePath = await createFixture('nextjs-no-shadcn');
    try {
      await initProject(fixturePath);

      const tokensDir = join(fixturePath, '.rafters', 'tokens');
      const registry = loadRegistryFromDir(tokensDir, PLUGINS);

      for (const name of ['spacing-1', 'spacing-2', 'spacing-3']) {
        const token = registry.get(name);
        if (token) {
          registry.set(name, `${name}-custom-value`, { reason: 'rapid change test' });
        }
      }

      const css = registryToVars(registry);
      expect(css).toContain('spacing-1-custom-value');
      expect(css).toContain('spacing-2-custom-value');
      expect(css).toContain('spacing-3-custom-value');
    } finally {
      await cleanupFixture(fixturePath);
    }
  });
});
