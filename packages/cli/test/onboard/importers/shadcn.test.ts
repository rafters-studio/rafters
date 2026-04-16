import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { shadcnImporter } from '../../../src/onboard/importers/shadcn.js';

// Sample shadcn globals.css content
const SHADCN_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
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
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
`;

// Minimal CSS that looks like shadcn
const MINIMAL_SHADCN_CSS = `:root {
  --background: 0 0% 100%;
  --foreground: 222 84% 5%;
  --primary: 222 47% 11%;
  --radius: 0.5rem;
}`;

// Non-shadcn CSS
const GENERIC_CSS = `:root {
  --brand-color: #ff0000;
  --spacing-sm: 8px;
  --font-size-base: 16px;
}`;

describe('shadcn Importer', () => {
  const testDir = join(process.cwd(), '.test-shadcn-importer');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('has correct id and priority', () => {
      expect(shadcnImporter.metadata.id).toBe('shadcn');
      expect(shadcnImporter.metadata.priority).toBe(80);
    });

    it('declares CSS file patterns', () => {
      expect(shadcnImporter.metadata.filePatterns).toContain('globals.css');
    });
  });

  describe('detect', () => {
    it('detects shadcn project with app/globals.css', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);

      expect(detection.canImport).toBe(true);
      expect(detection.confidence).toBeGreaterThanOrEqual(0.7);
      expect(detection.sourcePaths).toHaveLength(1);
      expect(detection.sourcePaths[0]).toContain('globals.css');
    });

    it('detects shadcn project with src/app/globals.css', async () => {
      const srcAppDir = join(testDir, 'src', 'app');
      await mkdir(srcAppDir, { recursive: true });
      await writeFile(join(srcAppDir, 'globals.css'), SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);

      expect(detection.canImport).toBe(true);
      expect(detection.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('detects minimal shadcn patterns', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), MINIMAL_SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);

      expect(detection.canImport).toBe(true);
      // Can detect via sourceType='shadcn' or marker count
      expect(detection.detectedBy[0]).toMatch(/shadcn|markers/);
    });

    it('rejects non-shadcn CSS', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), GENERIC_CSS);

      const detection = await shadcnImporter.detect(testDir);

      expect(detection.canImport).toBe(false);
    });

    it('returns canImport false when no CSS files exist', async () => {
      const detection = await shadcnImporter.detect(testDir);

      expect(detection.canImport).toBe(false);
      expect(detection.confidence).toBe(0);
    });
  });

  describe('import', () => {
    it('imports tokens from shadcn CSS', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      expect(result.source).toBe('shadcn');
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.tokensCreated).toBe(result.tokens.length);
    });

    it('converts HSL values to OKLCH', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), MINIMAL_SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      // Find the background token (0 0% 100% = white)
      const bgToken = result.tokens.find((t) => t.name === 'background');
      expect(bgToken).toBeDefined();
      expect(bgToken?.value).toMatch(/^oklch\(/);
    });

    it('creates dark mode variants with -dark suffix', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      const darkTokens = result.tokens.filter((t) => t.name.endsWith('-dark'));
      expect(darkTokens.length).toBeGreaterThan(0);

      // Check a specific dark token
      const darkBg = result.tokens.find((t) => t.name === 'background-dark');
      expect(darkBg).toBeDefined();
      expect(darkBg?.usageContext).toContain('dark mode');
    });

    it('maps semantic colors correctly', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), MINIMAL_SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      const primary = result.tokens.find((t) => t.name === 'primary-500');
      expect(primary).toBeDefined();
      expect(primary?.category).toBe('palette');
      expect(primary?.namespace).toBe('color');
    });

    it('handles radius token', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), MINIMAL_SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      const radius = result.tokens.find((t) => t.name === 'radius-md');
      expect(radius).toBeDefined();
      expect(radius?.value).toBe('0.5rem');
      expect(radius?.namespace).toBe('radius');
    });

    it('sets userOverride to null on all tokens', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), MINIMAL_SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      for (const token of result.tokens) {
        expect(token.userOverride).toBeNull();
      }
    });

    it('includes semantic meaning from source variable', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      await writeFile(join(appDir, 'globals.css'), MINIMAL_SHADCN_CSS);

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      const bgToken = result.tokens.find((t) => t.name === 'background');
      expect(bgToken?.semanticMeaning).toContain('--background');
    });

    it('reports skipped variables count', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      // Add some non-mappable variables
      const cssWithExtras = `${MINIMAL_SHADCN_CSS}
:root {
  --custom-thing: blue;
  --another-var: 10px;
}`;
      await writeFile(join(appDir, 'globals.css'), cssWithExtras);

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      expect(result.skipped).toBeGreaterThan(0);
      expect(result.variablesProcessed).toBeGreaterThan(result.tokensCreated);
    });
  });

  describe('HSL parsing', () => {
    it('parses standard shadcn HSL format', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      // Need enough markers to pass detection
      await writeFile(
        join(appDir, 'globals.css'),
        `:root {
  --background: 220 14% 96%;
  --foreground: 0 0% 0%;
  --primary: 200 50% 50%;
  --radius: 0.5rem;
}`,
      );

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      const bg = result.tokens.find((t) => t.name === 'background');
      expect(bg?.value).toMatch(/^oklch\(/);
    });

    it('parses HSL with decimal values', async () => {
      const appDir = join(testDir, 'app');
      await mkdir(appDir, { recursive: true });
      // Need enough markers to pass detection
      await writeFile(
        join(appDir, 'globals.css'),
        `:root {
  --background: 220.5 14.3% 96.7%;
  --foreground: 0 0% 0%;
  --primary: 200 50% 50%;
  --radius: 0.5rem;
}`,
      );

      const detection = await shadcnImporter.detect(testDir);
      const result = await shadcnImporter.import(testDir, detection);

      const bg = result.tokens.find((t) => t.name === 'background');
      expect(bg?.value).toMatch(/^oklch\(/);
    });
  });
});
