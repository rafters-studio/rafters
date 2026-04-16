import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tailwindV4Importer } from '../../../src/onboard/importers/tailwind-v4.js';

// Tailwind v4 CSS with @theme block
const TAILWIND_V4_CSS = `@import "tailwindcss";

@theme {
  --color-primary-50: oklch(0.97 0.01 250);
  --color-primary-100: oklch(0.93 0.02 250);
  --color-primary-200: oklch(0.87 0.04 250);
  --color-primary-300: oklch(0.78 0.08 250);
  --color-primary-400: oklch(0.68 0.12 250);
  --color-primary-500: oklch(0.55 0.15 250);
  --color-primary-600: oklch(0.48 0.14 250);
  --color-primary-700: oklch(0.40 0.12 250);
  --color-primary-800: oklch(0.33 0.10 250);
  --color-primary-900: oklch(0.27 0.08 250);
  --color-primary-950: oklch(0.20 0.06 250);

  --color-accent-500: oklch(0.70 0.20 150);

  --spacing-0: 0px;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --spacing-8: 2rem;

  --font-sans: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);

  --inset-shadow-sm: inset 0 1px 1px 0 rgb(0 0 0 / 0.05);
  --inset-shadow-md: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);

  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  --duration-150: 150ms;
  --duration-300: 300ms;

  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
}
`;

// Minimal Tailwind v4 with just colors
const MINIMAL_TAILWIND_CSS = `@import "tailwindcss";

@theme {
  --color-brand: oklch(0.6 0.2 280);
  --spacing-4: 1rem;
  --radius-md: 0.375rem;
}
`;

// Not Tailwind v4 -- plain CSS
const PLAIN_CSS = `:root {
  --brand-color: #ff0000;
  --spacing-sm: 8px;
}`;

describe('Tailwind v4 Importer', () => {
  const testDir = join(process.cwd(), '.test-tw4-importer');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('has correct id and priority', () => {
      expect(tailwindV4Importer.metadata.id).toBe('tailwind-v4');
      expect(tailwindV4Importer.metadata.priority).toBe(90);
    });
  });

  describe('detect', () => {
    it('detects @theme block in src/index.css', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);

      expect(detection.canImport).toBe(true);
      expect(detection.confidence).toBe(0.95);
      expect(detection.detectedBy[0]).toMatch(/@theme/);
      expect(detection.sourcePaths).toHaveLength(1);
    });

    it('detects @theme block in app/globals.css', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);

      expect(detection.canImport).toBe(true);
      expect(detection.confidence).toBe(0.95);
    });

    it('rejects CSS without @theme', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), PLAIN_CSS);

      const detection = await tailwindV4Importer.detect(testDir);

      expect(detection.canImport).toBe(false);
    });

    it('returns canImport false when no CSS files exist', async () => {
      const detection = await tailwindV4Importer.detect(testDir);

      expect(detection.canImport).toBe(false);
      expect(detection.confidence).toBe(0);
    });
  });

  describe('import', () => {
    it('imports all token namespaces', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      expect(result.source).toBe('tailwind-v4');
      expect(result.tokens.length).toBeGreaterThan(0);

      const categories = new Set(result.tokens.map((t) => t.category));
      expect(categories).toContain('color');
      expect(categories).toContain('spacing');
      expect(categories).toContain('typography');
      expect(categories).toContain('radius');
      expect(categories).toContain('shadow');
      expect(categories).toContain('motion');
    });

    it('maps color scale preserving positions', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      const colorTokens = result.tokens.filter((t) => t.category === 'color');
      const primaryTokens = colorTokens.filter((t) => t.name.startsWith('primary-'));
      expect(primaryTokens.length).toBe(11); // 50-950

      const primary500 = primaryTokens.find((t) => t.name === 'primary-500');
      expect(primary500?.value).toBe('oklch(0.55 0.15 250)');
    });

    it('maps spacing tokens', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      const spacing = result.tokens.filter((t) => t.namespace === 'spacing');
      expect(spacing.length).toBe(5);

      const s4 = spacing.find((t) => t.name === '4');
      expect(s4?.value).toBe('1rem');
    });

    it('maps motion tokens with rafters namespace prefix', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      const motionTokens = result.tokens.filter((t) => t.namespace === 'motion');

      // --ease-in-out -> motion-ease-in-out
      const easeInOut = motionTokens.find((t) => t.name === 'motion-ease-in-out');
      expect(easeInOut).toBeDefined();
      expect(easeInOut?.value).toContain('cubic-bezier');

      // --duration-150 -> motion-duration-150
      const dur150 = motionTokens.find((t) => t.name === 'motion-duration-150');
      expect(dur150).toBeDefined();
      expect(dur150?.value).toBe('150ms');
    });

    it('maps inset-shadow without colliding with shadow', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      const shadowTokens = result.tokens.filter((t) => t.namespace === 'shadow');

      // --shadow-sm -> sm, --inset-shadow-sm -> inset-sm (no collision)
      const shadowSm = shadowTokens.find((t) => t.name === 'sm');
      expect(shadowSm).toBeDefined();

      const insetSm = shadowTokens.find((t) => t.name === 'inset-sm');
      expect(insetSm).toBeDefined();
      expect(insetSm?.value).toContain('inset');

      // Both shadow and inset-shadow are present, not deduplicated
      expect(shadowTokens.length).toBe(4); // sm, md, inset-sm, inset-md
    });

    it('skips breakpoint and container namespaces', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      const breakpointTokens = result.tokens.filter((t) => t.name.includes('breakpoint'));
      expect(breakpointTokens).toHaveLength(0);
      expect(result.skipped).toBeGreaterThan(0);
    });

    it('sets userOverride to null on all tokens', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), MINIMAL_TAILWIND_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      for (const token of result.tokens) {
        expect(token.userOverride).toBeNull();
      }
    });

    it('includes semantic meaning from source variable', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), MINIMAL_TAILWIND_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      const brand = result.tokens.find((t) => t.name === 'brand');
      expect(brand?.semanticMeaning).toContain('Tailwind v4');
      expect(brand?.semanticMeaning).toContain('--color-brand');
    });

    it('reports accurate counts', async () => {
      const srcDir = join(testDir, 'src');
      await mkdir(srcDir, { recursive: true });
      await writeFile(join(srcDir, 'index.css'), TAILWIND_V4_CSS);

      const detection = await tailwindV4Importer.detect(testDir);
      const result = await tailwindV4Importer.import(testDir, detection);

      expect(result.tokensCreated).toBe(result.tokens.length);
      expect(result.variablesProcessed).toBe(result.tokensCreated + result.skipped);
    });
  });
});
