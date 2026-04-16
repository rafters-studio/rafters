import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { genericCSSImporter } from '../../../src/onboard/importers/generic-css.js';

// Sample generic CSS with various variable types
const GENERIC_CSS = `:root {
  --brand-primary: #3b82f6;
  --brand-secondary: #10b981;
  --text-color: #1f2937;
  --background-color: #ffffff;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --font-size-base: 16px;
  --border-radius: 4px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --transition-duration: 200ms;
}

.dark {
  --text-color: #f9fafb;
  --background-color: #111827;
}
`;

// Minimal CSS with just a few variables
const MINIMAL_CSS = `:root {
  --color-1: red;
  --color-2: blue;
  --color-3: green;
}`;

// CSS that looks like shadcn (should be skipped)
const SHADCN_CSS = `:root {
  --background: 0 0% 100%;
  --foreground: 222 84% 5%;
  --primary: 222 47% 11%;
  --secondary: 210 40% 96%;
  --muted: 210 40% 96%;
}`;

// CSS with only 2 variables (below threshold)
const INSUFFICIENT_CSS = `:root {
  --one: red;
  --two: blue;
}`;

describe('Generic CSS Importer', () => {
  const testDir = join(process.cwd(), '.test-generic-css-importer');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('has correct id and low priority', () => {
      expect(genericCSSImporter.metadata.id).toBe('generic-css');
      expect(genericCSSImporter.metadata.priority).toBe(10);
    });

    it('is a fallback importer', () => {
      // Priority 10 is lower than shadcn (80)
      expect(genericCSSImporter.metadata.priority).toBeLessThan(80);
    });
  });

  describe('detect', () => {
    it('detects CSS files with variables', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), GENERIC_CSS);

      const detection = await genericCSSImporter.detect(testDir);

      expect(detection.canImport).toBe(true);
      expect(detection.confidence).toBeGreaterThan(0.5);
      expect(detection.sourcePaths).toHaveLength(1);
    });

    it('skips shadcn-style CSS', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), SHADCN_CSS);

      const detection = await genericCSSImporter.detect(testDir);

      // Should not detect shadcn CSS - let shadcn importer handle it
      expect(detection.canImport).toBe(false);
    });

    it('requires minimum number of variables', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), INSUFFICIENT_CSS);

      const detection = await genericCSSImporter.detect(testDir);

      expect(detection.canImport).toBe(false);
    });

    it('returns false when no CSS files exist', async () => {
      const detection = await genericCSSImporter.detect(testDir);

      expect(detection.canImport).toBe(false);
      expect(detection.confidence).toBe(0);
    });

    it('increases confidence with more variables', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });

      // Create CSS with many variables
      const manyVars = `:root {\n${Array.from({ length: 50 }, (_, i) => `  --var-${i}: value;`).join('\n')}\n}`;
      await writeFile(join(stylesDir, 'variables.css'), manyVars);

      const detection = await genericCSSImporter.detect(testDir);

      expect(detection.canImport).toBe(true);
      expect(detection.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('import', () => {
    it('imports tokens from CSS variables', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), GENERIC_CSS);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      expect(result.source).toBe('generic-css');
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.tokensCreated).toBe(result.tokens.length);
    });

    it('infers color category for color-related variables', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), GENERIC_CSS);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      const brandPrimary = result.tokens.find((t) => t.name === 'brand-primary');
      expect(brandPrimary).toBeDefined();
      expect(brandPrimary?.category).toBe('color');
      expect(brandPrimary?.namespace).toBe('color');
    });

    it('infers spacing category for spacing variables', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), GENERIC_CSS);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      const spacingMd = result.tokens.find((t) => t.name === 'spacing-md');
      expect(spacingMd).toBeDefined();
      expect(spacingMd?.category).toBe('spacing');
      expect(spacingMd?.namespace).toBe('spacing');
    });

    it('infers radius category for border-radius variables', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), GENERIC_CSS);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      const radius = result.tokens.find((t) => t.name === 'border-radius');
      expect(radius).toBeDefined();
      expect(radius?.category).toBe('radius');
    });

    it('infers motion category for duration variables', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), GENERIC_CSS);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      const duration = result.tokens.find((t) => t.name === 'transition-duration');
      expect(duration).toBeDefined();
      expect(duration?.category).toBe('motion');
    });

    it('creates dark mode variants with -dark suffix', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), GENERIC_CSS);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      const darkTokens = result.tokens.filter((t) => t.name.endsWith('-dark'));
      expect(darkTokens.length).toBeGreaterThan(0);

      const darkBg = result.tokens.find((t) => t.name === 'background-color-dark');
      expect(darkBg).toBeDefined();
      expect(darkBg?.usageContext).toContain('dark mode');
    });

    it('sets userOverride to null on all tokens', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), MINIMAL_CSS);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      for (const token of result.tokens) {
        expect(token.userOverride).toBeNull();
      }
    });

    it('preserves original CSS values', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(join(stylesDir, 'variables.css'), GENERIC_CSS);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      const brandPrimary = result.tokens.find((t) => t.name === 'brand-primary');
      expect(brandPrimary?.value).toBe('#3b82f6');
    });

    it('creates separate light and dark mode tokens', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      // CSS with same variable in both :root and .dark
      const cssWithModes = `:root {
  --color-primary: red;
  --color-secondary: blue;
  --color-accent: green;
}
.dark {
  --color-primary: darkred;
  --color-secondary: darkblue;
  --color-accent: darkgreen;
}`;
      await writeFile(join(stylesDir, 'variables.css'), cssWithModes);

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      // Should have both light and dark variants
      const primaryLight = result.tokens.find((t) => t.name === 'color-primary');
      const primaryDark = result.tokens.find((t) => t.name === 'color-primary-dark');
      expect(primaryLight).toBeDefined();
      expect(primaryDark).toBeDefined();
      expect(primaryLight?.value).toBe('red');
      expect(primaryDark?.value).toBe('darkred');
    });
  });

  describe('category inference', () => {
    it('categorizes background as color', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(
        join(stylesDir, 'variables.css'),
        `:root {
  --bg-primary: white;
  --bg-secondary: gray;
  --background-main: blue;
}`,
      );

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      for (const token of result.tokens) {
        expect(token.category).toBe('color');
      }
    });

    it('categorizes shadow as shadow', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(
        join(stylesDir, 'variables.css'),
        `:root {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --elevation-1: 0 2px 4px rgba(0,0,0,0.1);
  --box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}`,
      );

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      for (const token of result.tokens) {
        expect(token.category).toBe('shadow');
      }
    });

    it('uses misc for unrecognized patterns', async () => {
      const stylesDir = join(testDir, 'styles');
      await mkdir(stylesDir, { recursive: true });
      await writeFile(
        join(stylesDir, 'variables.css'),
        `:root {
  --custom-thing: value;
  --my-var: 123;
  --foo-bar: baz;
}`,
      );

      const detection = await genericCSSImporter.detect(testDir);
      const result = await genericCSSImporter.import(testDir, detection);

      for (const token of result.tokens) {
        expect(token.category).toBe('misc');
      }
    });
  });
});
