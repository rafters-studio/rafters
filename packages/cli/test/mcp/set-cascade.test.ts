/**
 * Integration tests for `rafters_token set` semantic family cascade.
 *
 * Verifies the fix from #1211: setting a semantic family slot (primary, accent,
 * destructive, etc.) cascades to all derivatives (-foreground, -hover, -active,
 * -border, -ring, -focus, -subtle) instead of writing only the single token.
 *
 * Setup pattern:
 * 1. Build a fixture project with seeded default tokens.
 * 2. Run rafters_onboard map to enrich a perceptual color family + create palette
 *    positions. This is the prep step before the user can set a semantic at it.
 * 3. Run rafters_token set on the semantic family slot.
 * 4. Verify the cascade list and that derivatives moved to the new family.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodePersistenceAdapter } from '@rafters/design-tokens';
import { afterEach, describe, expect, it } from 'vitest';
import { RaftersToolHandler } from '../../src/mcp/tools.js';

async function createCascadeFixture(name: string): Promise<string> {
  const dir = join(tmpdir(), `rafters-set-cascade-${name}-${Date.now()}`);
  await mkdir(join(dir, '.rafters', 'tokens'), { recursive: true });
  await mkdir(join(dir, '.rafters', 'output'), { recursive: true });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'index.css'), '@import "tailwindcss";\n');
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name,
      version: '0.1.0',
      devDependencies: { tailwindcss: '^4.1.0', vite: '^6.0.0' },
    }),
  );
  await writeFile(
    join(dir, '.rafters', 'config.rafters.json'),
    JSON.stringify({
      framework: 'vite',
      componentsPath: 'src/components/ui',
      primitivesPath: 'src/lib/primitives',
      compositesPath: 'src/composites',
      cssPath: 'src/index.css',
      shadcn: false,
      exports: { tailwind: true, typescript: false, dtcg: false, compiled: false },
      installed: { components: [], primitives: [], composites: [] },
    }),
  );

  // Seed the registry with default tokens
  const { buildColorSystem } = await import('@rafters/design-tokens');
  const { registry } = buildColorSystem({});
  const adapter = new NodePersistenceAdapter(dir);
  await adapter.save(registry.list());

  return dir;
}

/**
 * Enrich a perceptual color family via rafters_onboard map.
 * Returns the perceptual family name (the registry key for the ColorValue).
 */
async function enrichFamily(
  handler: RaftersToolHandler,
  projectRoot: string,
  semanticTarget: string,
  oklchValue: string,
): Promise<string> {
  const result = await handler.handleToolCall('rafters_onboard', {
    action: 'map',
    confirmed: true,
    mappings: [
      {
        source: '--test-source',
        target: semanticTarget,
        value: oklchValue,
        reason: `test fixture: enrich ${semanticTarget} for cascade test`,
      },
    ],
  });
  expect(result.isError).toBeFalsy();

  // Read back the semantic token to discover the perceptual family name
  const adapter = new NodePersistenceAdapter(projectRoot);
  const tokens = await adapter.load();
  const semanticToken = tokens.find((t) => t.name === semanticTarget);
  const ref = semanticToken?.value as { family?: string } | undefined;
  if (!ref?.family) {
    throw new Error(`Failed to enrich ${semanticTarget}: no perceptual family on value`);
  }
  return ref.family;
}

describe('rafters_token set semantic family cascade', () => {
  let fixturePath: string;

  afterEach(async () => {
    if (fixturePath) await rm(fixturePath, { recursive: true, force: true });
  });

  it('cascades all accent derivatives when accent is re-targeted to a new family', async () => {
    fixturePath = await createCascadeFixture('accent-cascade');
    const handler = new RaftersToolHandler(fixturePath);

    // Step 1: enrich a new perceptual family under the accent slot
    const familyName = await enrichFamily(handler, fixturePath, 'accent', 'oklch(0.65 0.2 40)');

    // Step 2: re-target accent to a specific position of that family
    const result = await handler.handleToolCall('rafters_token', {
      action: 'set',
      name: 'accent',
      value: `${familyName}-900`,
      reason: 'cascade test: point accent at new family',
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse((result.content[0] as { text: string }).text);
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.familyCascade)).toBe(true);
    expect(data.familyCascade.length).toBeGreaterThan(0);
    expect(data.familyCascade).toEqual(
      expect.arrayContaining(['accent-foreground', 'accent-hover', 'accent-active']),
    );

    // Step 3: verify a derivative actually moved on disk
    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();
    const accentHover = tokens.find((t) => t.name === 'accent-hover');
    expect(accentHover).toBeDefined();
    const hoverValue = accentHover?.value as { family?: string } | undefined;
    expect(hoverValue?.family).toBe(familyName);
  });

  it('preserves dependsOn[0] as family name not family-position', async () => {
    fixturePath = await createCascadeFixture('depson-shape');
    const handler = new RaftersToolHandler(fixturePath);

    const familyName = await enrichFamily(handler, fixturePath, 'accent', 'oklch(0.65 0.2 40)');

    await handler.handleToolCall('rafters_token', {
      action: 'set',
      name: 'accent',
      value: `${familyName}-900`,
      reason: 'cascade test: dependsOn shape check',
    });

    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();
    const accent = tokens.find((t) => t.name === 'accent');
    expect(accent?.dependsOn?.[0]).toBe(familyName);
    // Must NOT be a family-position string like "rust-orange-900"
    expect(accent?.dependsOn?.[0]).not.toMatch(/-\d+$/);
  });

  it('does not cascade when target is a derivative not a family slot', async () => {
    fixturePath = await createCascadeFixture('derivative-no-cascade');
    const handler = new RaftersToolHandler(fixturePath);

    const familyName = await enrichFamily(handler, fixturePath, 'accent', 'oklch(0.65 0.2 40)');

    const result = await handler.handleToolCall('rafters_token', {
      action: 'set',
      name: 'accent-hover',
      value: `${familyName}-700`,
      reason: 'cascade test: single derivative override should not cascade',
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse((result.content[0] as { text: string }).text);
    expect(data.ok).toBe(true);
    expect(data.familyCascade).toEqual([]);
  });

  it('preserves human overrides on derivatives during family cascade', async () => {
    fixturePath = await createCascadeFixture('preserve-overrides');
    const handler = new RaftersToolHandler(fixturePath);

    const familyName = await enrichFamily(handler, fixturePath, 'accent', 'oklch(0.65 0.2 40)');

    // First, manually pin accent-hover with a non-auto-cascade reason
    await handler.handleToolCall('rafters_token', {
      action: 'set',
      name: 'accent-hover',
      value: 'neutral-700',
      reason: 'designer-pinned hover state for accessibility audit',
    });

    // Then re-target the family
    await handler.handleToolCall('rafters_token', {
      action: 'set',
      name: 'accent',
      value: `${familyName}-900`,
      reason: 'family swap',
    });

    // accent-hover should still be neutral-700
    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();
    const accentHover = tokens.find((t) => t.name === 'accent-hover');
    const hoverValue = accentHover?.value as { family?: string; position?: string } | undefined;
    expect(hoverValue?.family).toBe('neutral');
    expect(hoverValue?.position).toBe('700');
  });
});
