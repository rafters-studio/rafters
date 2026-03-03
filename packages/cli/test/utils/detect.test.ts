import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectFramework,
  detectProject,
  detectShadcn,
  detectTailwindVersion,
  isTailwindV3,
  parseCssVariables,
} from '../../src/utils/detect.js';

describe('detectFramework', () => {
  const testDir = join(tmpdir(), 'rafters-test-detect-framework');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should detect Next.js', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0', react: '^18.0.0' },
      }),
    );

    const framework = await detectFramework(testDir);
    expect(framework).toBe('next');
  });

  it('should detect Vite', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        devDependencies: { vite: '^5.0.0' },
      }),
    );

    const framework = await detectFramework(testDir);
    expect(framework).toBe('vite');
  });

  it('should detect React Router v7', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { 'react-router': '^7.0.0', react: '^19.0.0' },
      }),
    );

    const framework = await detectFramework(testDir);
    expect(framework).toBe('react-router');
  });

  it('should detect Remix', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { '@remix-run/react': '^2.0.0', '@remix-run/node': '^2.0.0' },
      }),
    );

    const framework = await detectFramework(testDir);
    expect(framework).toBe('remix');
  });

  it('should detect Astro', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { astro: '^4.0.0' },
      }),
    );

    const framework = await detectFramework(testDir);
    expect(framework).toBe('astro');
  });

  it('should return unknown for projects without recognized frameworks', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { express: '^4.0.0' },
      }),
    );

    const framework = await detectFramework(testDir);
    expect(framework).toBe('unknown');
  });

  it('should return unknown when package.json does not exist and no config files', async () => {
    const framework = await detectFramework(testDir);
    expect(framework).toBe('unknown');
  });

  it('should detect Astro from config file when not in package.json deps', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^19.0.0' },
      }),
    );
    await writeFile(join(testDir, 'astro.config.mjs'), 'export default {};');

    const framework = await detectFramework(testDir);
    expect(framework).toBe('astro');
  });

  it('should detect Next.js from config file when not in package.json deps', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^19.0.0' },
      }),
    );
    await writeFile(join(testDir, 'next.config.mjs'), 'export default {};');

    const framework = await detectFramework(testDir);
    expect(framework).toBe('next');
  });

  it('should detect Vite from config file when not in package.json deps', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^19.0.0' },
      }),
    );
    await writeFile(join(testDir, 'vite.config.ts'), 'export default {};');

    const framework = await detectFramework(testDir);
    expect(framework).toBe('vite');
  });

  it('should detect Astro from config file when no package.json exists', async () => {
    await writeFile(join(testDir, 'astro.config.ts'), 'export default {};');

    const framework = await detectFramework(testDir);
    expect(framework).toBe('astro');
  });

  it('should prefer package.json detection over config files', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { astro: '^4.0.0' },
      }),
    );
    await writeFile(join(testDir, 'next.config.mjs'), 'export default {};');

    const framework = await detectFramework(testDir);
    expect(framework).toBe('astro');
  });

  it('should prioritize Next.js over Vite when both are present', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
        devDependencies: { vite: '^5.0.0' },
      }),
    );

    const framework = await detectFramework(testDir);
    expect(framework).toBe('next');
  });
});

describe('detectTailwindVersion', () => {
  const testDir = join(tmpdir(), 'rafters-test-detect-tailwind');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should detect Tailwind v4', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        devDependencies: { tailwindcss: '^4.0.0' },
      }),
    );

    const version = await detectTailwindVersion(testDir);
    expect(version).toBe('4.0.0');
  });

  it('should detect Tailwind v3', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        devDependencies: { tailwindcss: '^3.4.0' },
      }),
    );

    const version = await detectTailwindVersion(testDir);
    expect(version).toBe('3.4.0');
  });

  it('should handle exact versions', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        devDependencies: { tailwindcss: '4.1.2' },
      }),
    );

    const version = await detectTailwindVersion(testDir);
    expect(version).toBe('4.1.2');
  });

  it('should return null when Tailwind is not installed', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        devDependencies: { vite: '^5.0.0' },
      }),
    );

    const version = await detectTailwindVersion(testDir);
    expect(version).toBeNull();
  });

  it('should return null when package.json does not exist', async () => {
    const version = await detectTailwindVersion(testDir);
    expect(version).toBeNull();
  });
});

describe('isTailwindV3', () => {
  it('should return true for v3 versions', () => {
    expect(isTailwindV3('3.0.0')).toBe(true);
    expect(isTailwindV3('3.4.0')).toBe(true);
    expect(isTailwindV3('3.99.99')).toBe(true);
  });

  it('should return false for v4 versions', () => {
    expect(isTailwindV3('4.0.0')).toBe(false);
    expect(isTailwindV3('4.1.0')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isTailwindV3(null)).toBe(false);
  });
});

describe('detectShadcn', () => {
  const testDir = join(tmpdir(), 'rafters-test-detect-shadcn');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should detect shadcn config', async () => {
    const config = {
      tailwind: {
        css: 'src/app/globals.css',
      },
    };
    await writeFile(join(testDir, 'components.json'), JSON.stringify(config));

    const result = await detectShadcn(testDir);
    expect(result).toEqual(config);
  });

  it('should return null when components.json does not exist', async () => {
    const result = await detectShadcn(testDir);
    expect(result).toBeNull();
  });
});

describe('parseCssVariables', () => {
  it('should parse light mode variables from :root', () => {
    const css = `
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
}
`;

    const { light, dark } = parseCssVariables(css);

    expect(light.background).toBe('0 0% 100%');
    expect(light.foreground).toBe('222.2 84% 4.9%');
    expect(light.primary).toBe('222.2 47.4% 11.2%');
    expect(light.primaryForeground).toBe('210 40% 98%');
    expect(dark).toEqual({});
  });

  it('should parse dark mode variables from .dark', () => {
    const css = `
:root {
  --background: 0 0% 100%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
`;

    const { light, dark } = parseCssVariables(css);

    expect(light.background).toBe('0 0% 100%');
    expect(dark.background).toBe('222.2 84% 4.9%');
    expect(dark.foreground).toBe('210 40% 98%');
  });

  it('should parse all shadcn color variables', () => {
    const css = `
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
}
`;

    const { light } = parseCssVariables(css);

    expect(light.background).toBeDefined();
    expect(light.foreground).toBeDefined();
    expect(light.card).toBeDefined();
    expect(light.cardForeground).toBeDefined();
    expect(light.popover).toBeDefined();
    expect(light.popoverForeground).toBeDefined();
    expect(light.primary).toBeDefined();
    expect(light.primaryForeground).toBeDefined();
    expect(light.secondary).toBeDefined();
    expect(light.secondaryForeground).toBeDefined();
    expect(light.muted).toBeDefined();
    expect(light.mutedForeground).toBeDefined();
    expect(light.accent).toBeDefined();
    expect(light.accentForeground).toBeDefined();
    expect(light.destructive).toBeDefined();
    expect(light.destructiveForeground).toBeDefined();
    expect(light.border).toBeDefined();
    expect(light.input).toBeDefined();
    expect(light.ring).toBeDefined();
  });

  it('should return empty objects for CSS without variables', () => {
    const css = `body { margin: 0; }`;

    const { light, dark } = parseCssVariables(css);

    expect(light).toEqual({});
    expect(dark).toEqual({});
  });
});

describe('detectProject', () => {
  const testDir = join(tmpdir(), 'rafters-test-detect-project');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should detect all project configuration at once', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: { next: '^14.0.0' },
        devDependencies: { tailwindcss: '^4.0.0' },
      }),
    );
    await writeFile(
      join(testDir, 'components.json'),
      JSON.stringify({
        tailwind: { css: 'src/app/globals.css' },
      }),
    );

    const result = await detectProject(testDir);

    expect(result.framework).toBe('next');
    expect(result.tailwindVersion).toBe('4.0.0');
    expect(result.shadcn).toEqual({ tailwind: { css: 'src/app/globals.css' } });
  });

  it('should handle projects without shadcn', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        devDependencies: { vite: '^5.0.0', tailwindcss: '^4.0.0' },
      }),
    );

    const result = await detectProject(testDir);

    expect(result.framework).toBe('vite');
    expect(result.tailwindVersion).toBe('4.0.0');
    expect(result.shadcn).toBeNull();
  });

  it('should handle empty directories', async () => {
    const result = await detectProject(testDir);

    expect(result.framework).toBe('unknown');
    expect(result.tailwindVersion).toBeNull();
    expect(result.shadcn).toBeNull();
  });
});
