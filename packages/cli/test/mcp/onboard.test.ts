/**
 * Integration tests for rafters_onboard MCP tool
 *
 * Tests the full analyze->map pipeline against realistic CSS fixtures:
 * - Horrible legacy CSS with mixed formats and junk
 * - Clean modern OKLCH design system
 * - shadcn project with standard 19 color vars
 * - Tailwind v4 @theme blocks
 * - Existing color scale families (11-step patterns)
 * - Blank project with only boilerplate
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodePersistenceAdapter } from '@rafters/design-tokens';
import { afterEach, describe, expect, it } from 'vitest';
import { RaftersToolHandler } from '../../src/mcp/tools.js';

// Helper to create a project fixture with CSS and .rafters/ scaffolding
async function createOnboardFixture(
  name: string,
  opts: {
    framework?: string;
    css?: Record<string, string>;
    shadcn?: boolean;
    seedTokens?: boolean;
  },
): Promise<string> {
  const dir = join(tmpdir(), `rafters-onboard-${name}-${Date.now()}`);
  await mkdir(dir, { recursive: true });

  // package.json
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = { tailwindcss: '^4.1.0' };
  if (opts.framework === 'next') deps.next = '^15.0.0';
  else if (opts.framework === 'astro') deps.astro = '^5.0.0';
  else devDeps.vite = '^6.0.0';

  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      { name, version: '0.1.0', dependencies: deps, devDependencies: devDeps },
      null,
      2,
    ),
  );

  // CSS files
  if (opts.css) {
    for (const [path, content] of Object.entries(opts.css)) {
      const fullPath = join(dir, path);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content);
    }
  }

  // shadcn components.json
  if (opts.shadcn) {
    await writeFile(
      join(dir, 'components.json'),
      JSON.stringify({
        $schema: 'https://ui.shadcn.com/schema.json',
        style: 'default',
        rsc: true,
        tsx: true,
        tailwind: {
          config: 'tailwind.config.ts',
          css: 'src/app/globals.css',
          baseColor: 'slate',
          cssVariables: true,
        },
        aliases: { components: '@/components', utils: '@/lib/utils' },
      }),
    );
  }

  // .rafters/ scaffolding (simulates post-init state)
  await mkdir(join(dir, '.rafters', 'tokens'), { recursive: true });
  await mkdir(join(dir, '.rafters', 'output'), { recursive: true });
  await writeFile(
    join(dir, '.rafters', 'config.rafters.json'),
    JSON.stringify({
      framework: opts.framework ?? 'vite',
      componentsPath: 'src/components/ui',
      primitivesPath: 'src/lib/primitives',
      compositesPath: 'src/composites',
      cssPath: Object.keys(opts.css ?? {})[0] ?? null,
      shadcn: opts.shadcn ?? false,
      exports: { tailwind: true, typescript: false, dtcg: false, compiled: false },
      installed: { components: [], primitives: [], composites: [] },
    }),
  );

  // Seed with default tokens if requested
  if (opts.seedTokens) {
    const { buildColorSystem } = await import('@rafters/design-tokens');
    const { registry } = buildColorSystem({});
    const adapter = new NodePersistenceAdapter(dir);
    await adapter.save(registry.list());
  }

  return dir;
}

// ==================== CSS Fixtures ====================

const CSS_HORRIBLE_LEGACY = `
/* legacy.css - the kind of mess you find in a 2019 project */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');

:root {
  --brand-blue: #2563eb;
  --brand-red: rgb(220, 38, 38);
  --brand-green: hsl(142, 71%, 45%);
  --text-dark: #1a1a1a;
  --text-light: #f5f5f5;
  --bg-gray: #f0f0f0;
  --border-color: rgba(0, 0, 0, 0.1);
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --radius: 8px;
  --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --z-dropdown: 1000;
  --transition: all 0.2s ease;
}

.dark {
  --brand-blue: #60a5fa;
  --brand-red: #f87171;
  --brand-green: #4ade80;
  --text-dark: #f5f5f5;
  --text-light: #1a1a1a;
  --bg-gray: #2a2a2a;
  --border-color: rgba(255, 255, 255, 0.1);
}

body { margin: 0; font-family: 'Inter', sans-serif; }
.container { max-width: 1200px; margin: 0 auto; padding: var(--spacing-lg); }
`;

const CSS_CLEAN_OKLCH = `
@import "tailwindcss";

:root {
  --brand-primary: oklch(0.55 0.2 250);
  --brand-secondary: oklch(0.6 0.15 180);
  --brand-accent: oklch(0.65 0.22 45);
  --surface-bg: oklch(0.98 0.005 250);
  --surface-fg: oklch(0.15 0.02 250);
  --success: oklch(0.6 0.2 145);
  --warning: oklch(0.75 0.15 85);
  --destructive: oklch(0.55 0.22 25);
}

.dark {
  --surface-bg: oklch(0.15 0.02 250);
  --surface-fg: oklch(0.95 0.005 250);
}
`;

const CSS_SHADCN_STANDARD = `
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
}
`;

const CSS_TAILWIND_V4_THEME = `
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.55 0.2 250);
  --color-accent: oklch(0.65 0.22 45);
  --color-surface: oklch(0.98 0.005 250);
  --spacing-gutter: 1.5rem;
  --radius-card: 0.75rem;
}
`;

const CSS_EXISTING_SCALES = `
@import "tailwindcss";

@theme {
  --color-blaze-50: oklch(0.97 0.02 45);
  --color-blaze-100: oklch(0.93 0.04 45);
  --color-blaze-200: oklch(0.87 0.08 45);
  --color-blaze-300: oklch(0.78 0.12 45);
  --color-blaze-400: oklch(0.70 0.16 45);
  --color-blaze-500: oklch(0.62 0.20 45);
  --color-blaze-600: oklch(0.55 0.20 45);
  --color-blaze-700: oklch(0.47 0.18 45);
  --color-blaze-800: oklch(0.38 0.14 45);
  --color-blaze-900: oklch(0.30 0.10 45);
  --color-blaze-950: oklch(0.22 0.06 45);

  --color-empire-50: oklch(0.97 0.01 0);
  --color-empire-100: oklch(0.93 0.03 0);
  --color-empire-200: oklch(0.87 0.06 0);
  --color-empire-300: oklch(0.78 0.10 0);
  --color-empire-400: oklch(0.68 0.15 0);
  --color-empire-500: oklch(0.55 0.22 0);
  --color-empire-600: oklch(0.48 0.22 0);
  --color-empire-700: oklch(0.40 0.18 0);
  --color-empire-800: oklch(0.32 0.14 0);
  --color-empire-900: oklch(0.25 0.10 0);
  --color-empire-950: oklch(0.18 0.06 0);

  --color-mud-500: oklch(0.45 0.08 70);
  --color-mud-600: oklch(0.38 0.08 70);
  --color-mud-700: oklch(0.30 0.06 70);
}
`;

const CSS_BLANK_BOILERPLATE = `
@import "tailwindcss";
`;

// ==================== Tests ====================

describe('rafters_onboard analyze', () => {
  let fixturePath: string;

  afterEach(async () => {
    if (fixturePath) await rm(fixturePath, { recursive: true, force: true });
  });

  it('finds all custom properties from horrible legacy CSS', async () => {
    fixturePath = await createOnboardFixture('horrible', {
      css: { 'src/index.css': CSS_HORRIBLE_LEGACY },
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'analyze' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    expect(data.cssFiles).toHaveLength(1);
    const file = data.cssFiles[0];

    // Should find all :root and .dark properties
    const rootProps = file.customProperties.filter(
      (p: { context: string }) => p.context === ':root',
    );
    const darkProps = file.customProperties.filter(
      (p: { context: string }) => p.context === '.dark',
    );

    // :root has colors, spacing, radius, shadow, font-size, z-index, transition
    expect(rootProps.length).toBeGreaterThanOrEqual(14);
    // .dark overrides 7 properties
    expect(darkProps.length).toBe(7);

    // Verify specific color values are captured correctly
    const brandBlue = rootProps.find((p: { name: string }) => p.name === '--brand-blue');
    expect(brandBlue?.value).toBe('#2563eb');

    const brandRed = rootProps.find((p: { name: string }) => p.name === '--brand-red');
    expect(brandRed?.value).toBe('rgb(220, 38, 38)');

    const brandGreen = rootProps.find((p: { name: string }) => p.name === '--brand-green');
    expect(brandGreen?.value).toBe('hsl(142, 71%, 45%)');

    // Non-color values captured too
    const spacing = rootProps.find((p: { name: string }) => p.name === '--spacing-lg');
    expect(spacing?.value).toBe('2rem');
  });

  it('finds OKLCH values from clean modern CSS', async () => {
    fixturePath = await createOnboardFixture('clean', {
      css: { 'src/index.css': CSS_CLEAN_OKLCH },
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'analyze' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    const rootProps = data.cssFiles[0].customProperties.filter(
      (p: { context: string }) => p.context === ':root',
    );
    expect(rootProps).toHaveLength(8);

    const primary = rootProps.find((p: { name: string }) => p.name === '--brand-primary');
    expect(primary?.value).toBe('oklch(0.55 0.2 250)');
  });

  it('detects shadcn project', async () => {
    fixturePath = await createOnboardFixture('shadcn', {
      framework: 'next',
      css: { 'src/app/globals.css': CSS_SHADCN_STANDARD },
      shadcn: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'analyze' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    expect(data.shadcn.detected).toBe(true);
    expect(data.shadcn.cssPath).toBe('src/app/globals.css');

    // Should find shadcn's 19 color vars + radius in :root
    const rootProps = data.cssFiles[0].customProperties.filter(
      (p: { context: string }) => p.context === ':root',
    );
    expect(rootProps.length).toBeGreaterThanOrEqual(19);

    // Plus dark mode overrides
    const darkProps = data.cssFiles[0].customProperties.filter(
      (p: { context: string }) => p.context === '.dark',
    );
    expect(darkProps.length).toBeGreaterThanOrEqual(4);
  });

  it('captures @theme blocks from Tailwind v4', async () => {
    fixturePath = await createOnboardFixture('tw4theme', {
      css: { 'src/index.css': CSS_TAILWIND_V4_THEME },
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'analyze' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    const file = data.cssFiles[0];
    expect(file.themeBlocks.length).toBeGreaterThanOrEqual(1);
    expect(file.themeBlocks[0]).toContain('--color-brand');
    expect(file.themeBlocks[0]).toContain('--spacing-gutter');
  });

  it('detects color scale families from existing 11-step patterns', async () => {
    fixturePath = await createOnboardFixture('scales', {
      css: { 'src/index.css': CSS_EXISTING_SCALES },
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'analyze' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    // Should detect blaze (11 positions) and empire (11 positions)
    expect(data.colorFamilies).toBeDefined();
    expect(data.colorFamilies.length).toBeGreaterThanOrEqual(2);

    const blaze = data.colorFamilies.find((f: { family: string }) => f.family === 'blaze');
    expect(blaze).toBeDefined();
    expect(blaze.positions).toHaveLength(11);
    expect(blaze.baseValue).toContain('oklch');

    const empire = data.colorFamilies.find((f: { family: string }) => f.family === 'empire');
    expect(empire).toBeDefined();
    expect(empire.positions).toHaveLength(11);

    // mud only has 3 positions but should still be detected
    const mud = data.colorFamilies.find((f: { family: string }) => f.family === 'mud');
    expect(mud).toBeDefined();
    expect(mud.positions).toHaveLength(3);

    // Guidance should mention the detected families
    expect(data.guidance).toContain('blaze');
    expect(data.guidance).toContain('empire');
  });

  it('returns empty findings for blank boilerplate CSS', async () => {
    fixturePath = await createOnboardFixture('blank', {
      css: { 'src/index.css': CSS_BLANK_BOILERPLATE },
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'analyze' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    // File found with import but no custom properties or theme blocks
    const file = data.cssFiles[0];
    if (file) {
      expect(file.customProperties).toHaveLength(0);
      expect(file.themeBlocks).toHaveLength(0);
    }
    expect(data.colorFamilies).toBeUndefined();
  });

  it('reports existing token count from seeded registry', async () => {
    fixturePath = await createOnboardFixture('seeded', {
      css: { 'src/index.css': CSS_CLEAN_OKLCH },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'analyze' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    // Default color system has 535 tokens
    expect(data.existingTokenCount).toBeGreaterThanOrEqual(500);
  });

  it('includes family checklist showing all 11 families as defaults after init', async () => {
    fixturePath = await createOnboardFixture('family-checklist', {
      css: { 'src/index.css': CSS_CLEAN_OKLCH },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'analyze' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    // All 11 families should be present in the checklist
    expect(data.familyStatus).toBeDefined();
    const families = Object.keys(data.familyStatus);
    expect(families).toContain('primary');
    expect(families).toContain('secondary');
    expect(families).toContain('destructive');
    expect(families).toContain('accent');
    expect(families).toContain('neutral');
    expect(families).toContain('success');
    expect(families).toContain('warning');
    expect(families).toContain('info');
    expect(families).toContain('highlight');
    expect(families).toContain('muted');
    expect(families).toContain('tertiary');

    // Most should be defaults, tertiary may be unmapped (not in default generators)
    for (const family of families) {
      const status = data.familyStatus[family].status;
      expect(status === 'default' || status === 'unmapped').toBe(true);
    }

    // Coverage should be 0/11 (no designer decisions yet)
    expect(data.familyCoverage).toBe('0/11 semantic families have designer decisions');
  });
});

describe('rafters_onboard status', () => {
  let fixturePath: string;

  afterEach(async () => {
    if (fixturePath) await rm(fixturePath, { recursive: true, force: true });
  });

  it('shows all defaults after fresh init', async () => {
    fixturePath = await createOnboardFixture('status-fresh', {
      css: { 'src/index.css': CSS_CLEAN_OKLCH },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', { action: 'status' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    expect(data.complete).toBe(false);
    expect(data.coverage).toBe('0/11');
    expect(data.families.mapped).toHaveLength(0);
    // 10 defaults + 1 unmapped (tertiary not in default generators)
    const totalUnaddressed = data.families.defaultsRemaining.length + data.families.unmapped.length;
    expect(totalUnaddressed).toBe(11);
  });

  it('tracks progress after designer maps some families', async () => {
    fixturePath = await createOnboardFixture('status-partial', {
      css: { 'src/index.css': CSS_HORRIBLE_LEGACY },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);

    // Designer maps 3 families
    await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [
        {
          source: '--brand-blue',
          target: 'primary',
          value: '#2563eb',
          reason: 'This blue has been on our nav since 2019',
        },
        {
          source: '--brand-red',
          target: 'destructive',
          value: 'rgb(220, 38, 38)',
          reason: 'Legal required this exact red for error states',
        },
        {
          source: '--brand-green',
          target: 'success',
          value: 'hsl(142, 71%, 45%)',
          reason: 'Chosen for deuteranopia distinguishability',
        },
      ],
    });

    // Check status
    const result = await handler.handleToolCall('rafters_onboard', { action: 'status' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    expect(data.complete).toBe(false);
    expect(data.coverage).toBe('3/11');
    expect(data.families.mapped).toContain('primary');
    expect(data.families.mapped).toContain('destructive');
    expect(data.families.mapped).toContain('success');
    // 8 remaining = defaults + unmapped
    const remaining = data.families.defaultsRemaining.length + data.families.unmapped.length;
    expect(remaining).toBe(8);
    expect(data.families.defaultsRemaining).not.toContain('primary');
  });

  it('includes custom families created during onboarding', async () => {
    fixturePath = await createOnboardFixture('status-custom', {
      css: { 'src/index.css': CSS_EXISTING_SCALES },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);

    // Create custom faction families
    await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [
        {
          source: '--color-blaze-500',
          target: 'blaze',
          value: 'oklch(0.62 0.20 45)',
          reason: 'Mandalorian faction color',
          namespace: 'color',
          category: 'color',
        },
      ],
    });

    const result = await handler.handleToolCall('rafters_onboard', { action: 'status' });
    const data = JSON.parse((result.content[0] as { text: string }).text);

    expect(data.families.customFamilies).toContain('blaze');
  });
});

// ==================== Designer Decisions ====================
// These are real designer decisions, not agent guesses.
// The test verifies the pipeline preserves them exactly.

const LEGACY_PROJECT_DECISIONS = {
  css: CSS_HORRIBLE_LEGACY,
  decisions: [
    {
      source: '--brand-blue',
      target: 'primary',
      value: '#2563eb',
      reason:
        'This blue has been on our nav since 2019. Customers associate it with our brand. The dark mode variant (#60a5fa) is lighter because we tested with 200 users and the original was unreadable on OLED screens.',
    },
    {
      source: '--brand-red',
      target: 'destructive',
      value: 'rgb(220, 38, 38)',
      reason:
        'Legal required a specific red for error states in the payment flow. This exact shade passed their accessibility audit in 2021. Do not change without legal sign-off.',
    },
    {
      source: '--brand-green',
      target: 'success',
      value: 'hsl(142, 71%, 45%)',
      reason:
        'Success green chosen to be distinguishable from the brand blue for colorblind users. We ran a deuteranopia simulation and this was the only green that worked.',
    },
    {
      source: '--spacing-lg',
      target: 'spacing-custom-lg',
      value: '2rem',
      reason: 'Marketing insisted on 32px section padding. It matches their print grid.',
      namespace: 'spacing',
      category: 'spacing',
    },
  ],
} as const;

const HUTTSPAWN_DECISIONS = {
  css: CSS_EXISTING_SCALES,
  decisions: [
    {
      source: '--color-blaze-500',
      target: 'blaze',
      value: 'oklch(0.62 0.20 45)',
      reason:
        'Mandalorian faction color. This warm orange represents the blaze of beskar forges. Used on all Mandalorian-aligned UI: clan badges, bounty boards, armory screens. The full scale was hand-tuned by the art director to feel like heated metal.',
      namespace: 'color',
      category: 'color',
    },
    {
      source: '--color-empire-500',
      target: 'empire',
      value: 'oklch(0.55 0.22 0)',
      reason:
        'Imperial faction color. Aggressive red for Sith-aligned UI elements: imperial missions, dark side abilities, empire territory on the galaxy map. Art director chose this over pure red because it reads as authoritarian without being cartoonish.',
      namespace: 'color',
      category: 'color',
    },
  ],
} as const;

describe('rafters_onboard map', () => {
  let fixturePath: string;

  afterEach(async () => {
    if (fixturePath) await rm(fixturePath, { recursive: true, force: true });
  });

  it('preserves the designer reasoning word-for-word through the pipeline', async () => {
    fixturePath = await createOnboardFixture('map-whygate', {
      css: { 'src/index.css': LEGACY_PROJECT_DECISIONS.css },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const decision = LEGACY_PROJECT_DECISIONS.decisions[0];
    await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [decision],
    });

    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();
    const primary = tokens.find((t) => t.name === 'primary');

    // The designer's exact words must survive the pipeline
    expect(primary?.userOverride?.reason).toContain('nav since 2019');
    expect(primary?.userOverride?.reason).toContain('200 users');
    expect(primary?.userOverride?.reason).toContain('OLED screens');
  });

  it('enriches hex into full ColorValue with 11-step scale', async () => {
    fixturePath = await createOnboardFixture('map-hex', {
      css: { 'src/index.css': LEGACY_PROJECT_DECISIONS.css },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [LEGACY_PROJECT_DECISIONS.decisions[0]],
    });

    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();

    // The semantic token "primary" now holds a ColorReference to the perceptual family name
    const primary = tokens.find((t) => t.name === 'primary');
    expect(typeof primary?.value).toBe('object');
    const ref = primary?.value as { family?: string; position?: string };
    expect(ref.family).toBeDefined();
    expect(ref.position).toBeDefined();

    // The ColorValue with the 11-step scale is under the perceptual family name
    const familyToken = tokens.find(
      (t) =>
        t.namespace === 'color' &&
        typeof t.value === 'object' &&
        'scale' in (t.value as Record<string, unknown>) &&
        t.name === ref.family,
    );
    expect(familyToken).toBeDefined();
    const cv = familyToken?.value as { scale?: unknown[]; name?: string };
    expect(cv.scale?.length).toBe(11);
    expect(typeof cv.name).toBe('string');
  });

  it('enriches rgb and hsl with designer reasoning intact', async () => {
    fixturePath = await createOnboardFixture('map-mixed', {
      css: { 'src/index.css': LEGACY_PROJECT_DECISIONS.css },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [LEGACY_PROJECT_DECISIONS.decisions[1], LEGACY_PROJECT_DECISIONS.decisions[2]],
    });

    const data = JSON.parse((result.content[0] as { text: string }).text);
    expect(data.summary.enriched).toBe(2);

    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();

    // Legal's exact requirement preserved
    const destructive = tokens.find((t) => t.name === 'destructive');
    expect(destructive?.userOverride?.reason).toContain('legal sign-off');

    // Colorblind testing rationale preserved
    const success = tokens.find((t) => t.name === 'success');
    expect(success?.userOverride?.reason).toContain('deuteranopia');

    // Both semantic tokens now hold ColorReferences to their perceptual family names
    // The ColorValues with 11-step scales are under the perceptual names
    for (const name of ['destructive', 'success']) {
      const token = tokens.find((t) => t.name === name);
      const ref = token?.value as { family?: string };
      expect(ref.family).toBeDefined();
      const familyToken = tokens.find((t) => t.name === ref.family);
      expect(familyToken).toBeDefined();
      const cv = familyToken?.value as { scale?: unknown[] };
      expect(cv.scale?.length).toBe(11);
    }
  });

  it('passes non-color values through as strings, not enriched', async () => {
    fixturePath = await createOnboardFixture('map-noncolor', {
      css: { 'src/index.css': LEGACY_PROJECT_DECISIONS.css },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [LEGACY_PROJECT_DECISIONS.decisions[3]],
    });

    const data = JSON.parse((result.content[0] as { text: string }).text);
    expect(data.results[0].enriched).toBe(false);

    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();
    const spacing = tokens.find((t) => t.name === 'spacing-custom-lg');
    expect(spacing?.value).toBe('2rem');
    // Marketing's reasoning preserved
    expect(spacing?.userOverride?.reason).toContain('print grid');
  });

  it('creates game-specific color families with art director reasoning', async () => {
    fixturePath = await createOnboardFixture('map-factions', {
      css: { 'src/index.css': HUTTSPAWN_DECISIONS.css },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [...HUTTSPAWN_DECISIONS.decisions],
    });

    const data = JSON.parse((result.content[0] as { text: string }).text);
    expect(data.summary.created).toBe(2);
    expect(data.summary.enriched).toBe(2);

    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();

    // Blaze: art director's intent preserved
    const blaze = tokens.find((t) => t.name === 'blaze');
    expect(blaze?.namespace).toBe('color');
    expect(blaze?.userOverride?.reason).toContain('beskar forges');
    const blazeValue = blaze?.value as { scale?: unknown[] };
    expect(blazeValue.scale?.length).toBe(11);

    // Empire: design rationale preserved
    const empire = tokens.find((t) => t.name === 'empire');
    expect(empire?.namespace).toBe('color');
    expect(empire?.userOverride?.reason).toContain('authoritarian without being cartoonish');
  });

  it('blocks unconfirmed mappings -- designer must review first', async () => {
    fixturePath = await createOnboardFixture('map-unconfirmed', {
      css: { 'src/index.css': CSS_CLEAN_OKLCH },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      // No confirmed: true -- agent hasn't asked the designer yet
      mappings: [
        {
          source: '--brand-primary',
          target: 'primary',
          value: 'oklch(0.55 0.2 250)',
          reason: 'Agent guessed this is primary',
        },
      ],
    });

    // Tool must refuse and instruct the agent to ask the designer
    expect(result.isError).toBe(true);
    const data = JSON.parse((result.content[0] as { text: string }).text);
    expect(data.error).toContain('Human confirmation required');
    expect(data.instructions).toBeDefined();
    expect(data.instructions.length).toBeGreaterThan(0);

    // Verify NO tokens were written
    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();
    const primary = tokens.find((t) => t.name === 'primary');
    // Primary exists from seed but should NOT have been modified
    const hasOverride = primary?.userOverride !== null;
    expect(hasOverride).toBe(false);
  });

  it('rejects mappings without reason -- the why-gate is not optional', async () => {
    fixturePath = await createOnboardFixture('map-noreason', {
      css: { 'src/index.css': CSS_CLEAN_OKLCH },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [
        {
          source: '--brand-primary',
          target: 'primary',
          value: 'oklch(0.55 0.2 250)',
          // No reason. The agent didn't ask the designer. This must fail.
        },
      ],
    });

    const data = JSON.parse((result.content[0] as { text: string }).text);
    expect(data.results[0].ok).toBe(false);
    expect(data.results[0].error).toContain('reason');
  });

  it('regenerates CSS output with enriched color scale after mapping', async () => {
    fixturePath = await createOnboardFixture('map-output', {
      css: { 'src/index.css': CSS_CLEAN_OKLCH },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [
        {
          source: '--brand-primary',
          target: 'primary',
          value: 'oklch(0.55 0.2 250)',
          reason:
            'Core brand identity. This specific blue was chosen by the founder in 2020 and appears on all external materials.',
        },
      ],
    });

    const cssOutput = await readFile(
      join(fixturePath, '.rafters', 'output', 'rafters.css'),
      'utf-8',
    );
    expect(cssOutput.length).toBeGreaterThan(0);
    expect(cssOutput).toContain('primary');
  });

  it('handles full onboard batch: colors enriched, spacing preserved, reasoning intact', async () => {
    fixturePath = await createOnboardFixture('map-batch', {
      css: { 'src/index.css': LEGACY_PROJECT_DECISIONS.css },
      seedTokens: true,
    });

    const handler = new RaftersToolHandler(fixturePath);
    const result = await handler.handleToolCall('rafters_onboard', {
      action: 'map',
      confirmed: true,
      mappings: [...LEGACY_PROJECT_DECISIONS.decisions],
    });

    const data = JSON.parse((result.content[0] as { text: string }).text);
    expect(data.ok).toBe(true);
    // 3 colors enriched (hex, rgb, hsl)
    expect(data.summary.enriched).toBe(3);
    // 3 existing semantic tokens updated
    expect(data.summary.set).toBe(3);
    // 1 new spacing token created
    expect(data.summary.created).toBe(1);
    expect(data.summary.failed).toBe(0);

    // Verify every designer decision survived
    const adapter = new NodePersistenceAdapter(fixturePath);
    const tokens = await adapter.load();
    for (const decision of LEGACY_PROJECT_DECISIONS.decisions) {
      const token = tokens.find((t) => t.name === decision.target);
      expect(token).toBeDefined();
      // The reason includes the designer's words (prefixed with "Onboarded from")
      const reasonWords = decision.reason.split(' ').slice(0, 3).join(' ');
      expect(token?.userOverride?.reason).toContain(reasonWords);
    }
  });
});
