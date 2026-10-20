import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectProject, findCssPath, isTailwindV3 } from '../../src/utils/detect.js';

describe('detectProject', () => {
  const testDir = join(tmpdir(), 'rafters-test-detect-project');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('framework from package.json deps', () => {
    it('detects Next.js', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0', react: '^18.0.0' } }),
      );
      expect((await detectProject(testDir)).framework).toBe('next');
    });

    it('detects Vite', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { vite: '^5.0.0' } }),
      );
      expect((await detectProject(testDir)).framework).toBe('vite');
    });

    it('detects React Router v7 before Remix', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'react-router': '^7.0.0', react: '^19.0.0' } }),
      );
      expect((await detectProject(testDir)).framework).toBe('react-router');
    });

    it('detects Remix from @remix-run packages', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { '@remix-run/react': '^2.0.0', '@remix-run/node': '^2.0.0' },
        }),
      );
      expect((await detectProject(testDir)).framework).toBe('remix');
    });

    it('detects Astro', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { astro: '^4.0.0' } }),
      );
      expect((await detectProject(testDir)).framework).toBe('astro');
    });

    it('falls through to unknown for lit without React', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { lit: '^3.0.0' } }),
      );
      expect((await detectProject(testDir)).framework).toBe('unknown');
    });

    it('falls through to vite for lit without React in a vite project', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { '@lit/reactive-element': '^2.0.0' },
          devDependencies: { vite: '^6.0.0' },
        }),
      );
      expect((await detectProject(testDir)).framework).toBe('vite');
    });

    it('detects vite when lit + react are both present', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { lit: '^3.0.0', react: '^19.0.0' },
          devDependencies: { vite: '^6.0.0' },
        }),
      );
      expect((await detectProject(testDir)).framework).toBe('vite');
    });

    it('falls through to unknown when lit + react are present but no other framework signal', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { lit: '^3.0.0', react: '^19.0.0' } }),
      );
      // lit is not a framework signal, and react alone is not one either.
      expect((await detectProject(testDir)).framework).toBe('unknown');
    });

    it('returns unknown for projects without recognized frameworks', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { express: '^4.0.0' } }),
      );
      expect((await detectProject(testDir)).framework).toBe('unknown');
    });

    it('prioritizes Next.js over Vite when both are present', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { next: '^14.0.0' },
          devDependencies: { vite: '^5.0.0' },
        }),
      );
      expect((await detectProject(testDir)).framework).toBe('next');
    });
  });

  describe('framework from config-file fallback', () => {
    it('falls back to astro.config.mjs', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^19.0.0' } }),
      );
      await writeFile(join(testDir, 'astro.config.mjs'), 'export default {};');
      expect((await detectProject(testDir)).framework).toBe('astro');
    });

    it('falls back to next.config.mjs', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^19.0.0' } }),
      );
      await writeFile(join(testDir, 'next.config.mjs'), 'export default {};');
      expect((await detectProject(testDir)).framework).toBe('next');
    });

    it('falls back to vite.config.ts', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^19.0.0' } }),
      );
      await writeFile(join(testDir, 'vite.config.ts'), 'export default {};');
      expect((await detectProject(testDir)).framework).toBe('vite');
    });

    it('falls back to astro.config.ts when no package.json exists', async () => {
      await writeFile(join(testDir, 'astro.config.ts'), 'export default {};');
      expect((await detectProject(testDir)).framework).toBe('astro');
    });

    it('prefers package.json detection over config files', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { astro: '^4.0.0' } }),
      );
      await writeFile(join(testDir, 'next.config.mjs'), 'export default {};');
      expect((await detectProject(testDir)).framework).toBe('astro');
    });

    it('returns unknown when no package.json and no config files', async () => {
      expect((await detectProject(testDir)).framework).toBe('unknown');
    });
  });

  describe('tailwind version', () => {
    it('extracts ^4.0.0 as 4.0.0', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { tailwindcss: '^4.0.0' } }),
      );
      expect((await detectProject(testDir)).tailwindVersion).toBe('4.0.0');
    });

    it('extracts ^3.4.0 as 3.4.0', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { tailwindcss: '^3.4.0' } }),
      );
      expect((await detectProject(testDir)).tailwindVersion).toBe('3.4.0');
    });

    it('handles exact versions', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { tailwindcss: '4.1.2' } }),
      );
      expect((await detectProject(testDir)).tailwindVersion).toBe('4.1.2');
    });

    it('returns null when Tailwind is not installed', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { vite: '^5.0.0' } }),
      );
      expect((await detectProject(testDir)).tailwindVersion).toBeNull();
    });

    it('returns null when package.json does not exist', async () => {
      expect((await detectProject(testDir)).tailwindVersion).toBeNull();
    });
  });

  describe('shadcn config', () => {
    it('returns parsed components.json when present', async () => {
      const config = { tailwind: { css: 'src/app/globals.css' } };
      await writeFile(join(testDir, 'components.json'), JSON.stringify(config));
      expect((await detectProject(testDir)).shadcn).toEqual(config);
    });

    it('returns null when components.json is absent', async () => {
      expect((await detectProject(testDir)).shadcn).toBeNull();
    });
  });

  describe('astroHasReact', () => {
    it('returns true when @astrojs/react is in dependencies', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { astro: '^5.0.0', '@astrojs/react': '^4.0.0' },
        }),
      );
      expect((await detectProject(testDir)).astroHasReact).toBe(true);
    });

    it('returns true when @astrojs/react is in devDependencies', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { astro: '^5.0.0' },
          devDependencies: { '@astrojs/react': '^4.0.0' },
        }),
      );
      expect((await detectProject(testDir)).astroHasReact).toBe(true);
    });

    it('returns false when @astrojs/react is not installed', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { astro: '^5.0.0' } }),
      );
      expect((await detectProject(testDir)).astroHasReact).toBe(false);
    });

    it('returns false when package.json does not exist', async () => {
      expect((await detectProject(testDir)).astroHasReact).toBe(false);
    });
  });

  describe('cssPath', () => {
    it('returns the first existing CSS file for the framework', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0' } }),
      );
      await mkdir(join(testDir, 'src/app'), { recursive: true });
      await writeFile(join(testDir, 'src/app/globals.css'), '/* css */');
      expect((await detectProject(testDir)).cssPath).toBe('src/app/globals.css');
    });

    it('returns null when no candidate CSS file exists', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0' } }),
      );
      expect((await detectProject(testDir)).cssPath).toBeNull();
    });

    it('walks candidate locations and returns the second when the first is absent', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ devDependencies: { vite: '^5.0.0' } }),
      );
      // vite cssLocations: ['src/index.css', 'src/main.css', ...]
      await mkdir(join(testDir, 'src'), { recursive: true });
      await writeFile(join(testDir, 'src/main.css'), '/* css */');
      expect((await detectProject(testDir)).cssPath).toBe('src/main.css');
    });
  });

  describe('combined record', () => {
    it('returns all fields at once', async () => {
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: { next: '^14.0.0', '@astrojs/react': '^4.0.0' },
          devDependencies: { tailwindcss: '^4.0.0' },
        }),
      );
      await writeFile(
        join(testDir, 'components.json'),
        JSON.stringify({ tailwind: { css: 'src/app/globals.css' } }),
      );
      await mkdir(join(testDir, 'src/app'), { recursive: true });
      await writeFile(join(testDir, 'src/app/globals.css'), '/* css */');

      const result = await detectProject(testDir);

      expect(result.framework).toBe('next');
      expect(result.tailwindVersion).toBe('4.0.0');
      expect(result.shadcn).toEqual({ tailwind: { css: 'src/app/globals.css' } });
      expect(result.astroHasReact).toBe(true);
      expect(result.cssPath).toBe('src/app/globals.css');
    });

    it('returns the empty-project shape when nothing is detectable', async () => {
      const result = await detectProject(testDir);
      expect(result).toEqual({
        framework: 'unknown',
        tailwindVersion: null,
        shadcn: null,
        astroHasReact: false,
        cssPath: null,
      });
    });
  });
});

describe('detectProject fail-fast', () => {
  const testDir = join(tmpdir(), 'rafters-test-detect-failfast');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('throws on malformed package.json', async () => {
    await writeFile(join(testDir, 'package.json'), '{ "dependencies": { ');
    await expect(detectProject(testDir)).rejects.toThrow();
  });

  it('throws on malformed components.json', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0' } }),
    );
    await writeFile(join(testDir, 'components.json'), '{ "tailwind": { ');
    await expect(detectProject(testDir)).rejects.toThrow();
  });

  it('throws on package.json that violates the schema', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      // dependencies must map string->string; numeric version fails Zod
      JSON.stringify({ dependencies: { next: 14 } }),
    );
    await expect(detectProject(testDir)).rejects.toThrow();
  });
});

describe('findCssPath', () => {
  const testDir = join(tmpdir(), 'rafters-test-find-css-path');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('returns the first existing path in framework order', async () => {
    // vanilla cssLocations: ['src/index.css', 'src/main.css', 'src/styles.css', 'styles/global.css']
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src/main.css'), '');
    await writeFile(join(testDir, 'src/styles.css'), '');
    expect(findCssPath(testDir, 'vanilla')).toBe('src/main.css');
  });

  it('returns null when no candidate exists', async () => {
    expect(findCssPath(testDir, 'next')).toBeNull();
  });

  it('does not throw on framework "unknown" -- walks the fallback list', async () => {
    // unknown cssLocations: ['src/styles/global.css', 'src/index.css', 'styles/globals.css']
    await mkdir(join(testDir, 'src'), { recursive: true });
    await writeFile(join(testDir, 'src/index.css'), '');
    expect(findCssPath(testDir, 'unknown')).toBe('src/index.css');
  });

  it('finds the override-framework path when the detected framework would miss it', async () => {
    // A Next project (cssLocations: src/app/globals.css | app/globals.css | styles/globals.css)
    // that the user overrides to react-router (cssLocations: app/app.css | ...).
    // Only `app/app.css` exists -- detected `next` would return null, overridden `react-router` finds it.
    await mkdir(join(testDir, 'app'), { recursive: true });
    await writeFile(join(testDir, 'app/app.css'), '');
    expect(findCssPath(testDir, 'next')).toBeNull();
    expect(findCssPath(testDir, 'react-router')).toBe('app/app.css');
  });
});

describe('isTailwindV3', () => {
  it('returns true for v3 versions', () => {
    expect(isTailwindV3('3.0.0')).toBe(true);
    expect(isTailwindV3('3.4.0')).toBe(true);
    expect(isTailwindV3('3.99.99')).toBe(true);
  });

  it('returns false for v4 versions', () => {
    expect(isTailwindV3('4.0.0')).toBe(false);
    expect(isTailwindV3('4.1.0')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isTailwindV3(null)).toBe(false);
  });
});
