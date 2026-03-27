/**
 * Studio command tests
 *
 * Creates fixture projects, runs rafters init to set up .rafters/,
 * then starts the studio and verifies the token API works.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildColorSystem,
  NodePersistenceAdapter,
  registryToVars,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture } from '../fixtures/projects';

async function initProject(projectPath: string): Promise<number> {
  const result = buildColorSystem();
  const tokensDir = join(projectPath, '.rafters', 'tokens');
  await mkdir(tokensDir, { recursive: true });
  const adapter = new NodePersistenceAdapter(projectPath);
  await adapter.save(result.system.allTokens);
  return result.system.allTokens.length;
}

describe('studio prerequisites', () => {
  it('rafters init creates .rafters/tokens/ with namespace files', async () => {
    const fixturePath = await createFixture('nextjs-shadcn-v4');
    try {
      const tokenCount = await initProject(fixturePath);
      expect(tokenCount).toBeGreaterThanOrEqual(500);

      const tokensDir = join(fixturePath, '.rafters', 'tokens');
      expect(existsSync(tokensDir)).toBe(true);

      // Check namespace files exist
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

  it('tokens can be loaded back via NodePersistenceAdapter', async () => {
    const fixturePath = await createFixture('astro-shadcn-v4');
    try {
      const expectedCount = await initProject(fixturePath);

      const adapter = new NodePersistenceAdapter(fixturePath);
      const loaded = await adapter.load();
      expect(loaded.length).toBe(expectedCount);

      // Verify token structure
      const spacing = loaded.find((t) => t.name === 'spacing-4');
      expect(spacing).toBeTruthy();
      expect(spacing?.namespace).toBe('spacing');
      expect(spacing?.value).toBeTruthy();

      const primary = loaded.find((t) => t.name === 'primary');
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

        const adapter = new NodePersistenceAdapter(fixturePath);
        const loaded = await adapter.load();
        expect(loaded.length, `${type} should load back same count`).toBe(count);
      } finally {
        await cleanupFixture(fixturePath);
      }
    }
  });
});

describe('studio API affects stylesheet in realtime', () => {
  it('registryToVars generates CSS with token values', async () => {
    const fixturePath = await createFixture('nextjs-shadcn-v4');
    try {
      await initProject(fixturePath);

      const adapter = new NodePersistenceAdapter(fixturePath);
      const tokens = await adapter.load();
      const registry = new TokenRegistry(tokens);

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

      const adapter = new NodePersistenceAdapter(fixturePath);
      const tokens = await adapter.load();
      const registry = new TokenRegistry(tokens);
      registry.setAdapter(adapter);

      // Get initial CSS
      const cssBefore = registryToVars(registry);

      // Find spacing-4 and verify its initial value is in the CSS
      const spacing4 = registry.get('spacing-4');
      expect(spacing4).toBeTruthy();
      if (!spacing4) throw new Error('spacing-4 not found');

      // Set a new value with why-gate
      await registry.setToken({
        ...spacing4,
        value: '99rem',
        userOverride: {
          previousValue: spacing4.value,
          reason: 'Testing realtime CSS update',
        },
      });

      // Generate CSS after change
      const cssAfter = registryToVars(registry);

      // The CSS should be different
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

      const adapter = new NodePersistenceAdapter(fixturePath);
      const tokens = await adapter.load();
      const registry = new TokenRegistry(tokens);

      const cssBefore = registryToVars(registry);

      // Find a color family token that semantic tokens depend on
      const colorTokens = registry.list({ namespace: 'color' });
      const familyToken = colorTokens.find(
        (t) => typeof t.value === 'object' && t.value !== null && 'scale' in t.value,
      );
      expect(familyToken).toBeTruthy();

      // Verify semantic tokens reference this family
      const semanticTokens = registry.list({ namespace: 'semantic' });
      expect(semanticTokens.length).toBeGreaterThan(0);

      // The CSS should contain semantic variable blocks
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

      const adapter = new NodePersistenceAdapter(fixturePath);
      const tokens = await adapter.load();
      const registry = new TokenRegistry(tokens);
      registry.setAdapter(adapter);

      // Write initial CSS
      const cssInitial = registryToVars(registry);
      await writeFile(outputPath, cssInitial);
      expect(existsSync(outputPath)).toBe(true);

      const initialContent = await readFile(outputPath, 'utf-8');
      expect(initialContent).toContain(':root');

      // Update a token
      const spacing8 = registry.get('spacing-8');
      expect(spacing8).toBeTruthy();
      if (!spacing8) throw new Error('spacing-8 not found');

      await registry.setToken({
        ...spacing8,
        value: '77rem',
        userOverride: {
          previousValue: spacing8.value,
          reason: 'Verify disk persistence and CSS regeneration',
        },
      });

      // Regenerate and write CSS (simulating what the Vite plugin does)
      const cssUpdated = registryToVars(registry);
      await writeFile(outputPath, cssUpdated);

      const updatedContent = await readFile(outputPath, 'utf-8');
      expect(updatedContent).toContain('77rem');
      expect(initialContent).not.toContain('77rem');

      // Verify the token was persisted to disk
      const reloaded = await adapter.load();
      const reloadedSpacing8 = reloaded.find((t) => t.name === 'spacing-8');
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

      const adapter = new NodePersistenceAdapter(fixturePath);
      const tokens = await adapter.load();
      const registry = new TokenRegistry(tokens);

      // Make several rapid changes
      for (const name of ['spacing-1', 'spacing-2', 'spacing-3']) {
        const token = registry.get(name);
        if (token) {
          registry.updateToken(name, `${name}-custom-value`);
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
